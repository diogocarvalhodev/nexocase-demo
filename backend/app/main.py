from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import asyncio
from collections import defaultdict, deque
from datetime import datetime, timedelta
import ipaddress
import logging
import os
import time
import uuid
from sqlalchemy import inspect, text

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models.config import SystemConfig
from app.models.tenant import Tenant
from app.routers import auth, incidents, schools, dashboard, reports, admin, options, tenant, presets
from app.services.demo_bootstrap import ensure_demo_data
from app.utils.request_context import set_request_id, reset_request_id, set_session_jti, reset_session_jti
from app.utils.tenant import set_current_tenant_id, reset_current_tenant_id
from app.services.audit_retention import execute_audit_retention, resolve_retention_days, record_audit_retention_metadata


logger = logging.getLogger("nexocase.security")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)

RATE_LIMIT_BUCKETS: dict[str, deque[float]] = defaultdict(deque)


def _ensure_phase1_schema(db):
    inspector = inspect(db.bind)
    tenant_columns = {col["name"] for col in inspector.get_columns("tenants")}

    if "business_type" not in tenant_columns:
        db.execute(text("ALTER TABLE tenants ADD COLUMN business_type VARCHAR(40)"))
    if "onboarding_completed" not in tenant_columns:
        db.execute(text("ALTER TABLE tenants ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE"))
    if "onboarding_completed_at" not in tenant_columns:
        db.execute(text("ALTER TABLE tenants ADD COLUMN onboarding_completed_at TIMESTAMP NULL"))

    table_names = set(inspector.get_table_names())
    if "dashboard_presets" not in table_names:
        db.execute(text(
            """
            CREATE TABLE dashboard_presets (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER NOT NULL REFERENCES tenants(id),
                user_id INTEGER NOT NULL REFERENCES users(id),
                name VARCHAR(120) NOT NULL,
                description TEXT NULL,
                config JSON NOT NULL,
                is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
            """
        ))
        db.execute(text("CREATE INDEX ix_dashboard_presets_id ON dashboard_presets (id)"))
        db.execute(text("CREATE INDEX ix_dashboard_presets_tenant_id ON dashboard_presets (tenant_id)"))
        db.execute(text("CREATE INDEX ix_dashboard_presets_user_id ON dashboard_presets (user_id)"))

    db.commit()


async def _audit_retention_scheduler():
    interval_seconds = max(1, settings.AUDIT_RETENTION_INTERVAL_HOURS) * 3600
    while True:
        db = SessionLocal()
        try:
            run_at = datetime.utcnow()
            retention_days = resolve_retention_days(db, None, settings.AUDIT_RETENTION_DEFAULT_DAYS)
            if retention_days > 0:
                cutoff, anonymized_count, removed_refresh_count = execute_audit_retention(
                    db,
                    retention_days,
                    dry_run=False,
                )
                record_audit_retention_metadata(
                    db,
                    run_at=run_at,
                    cutoff=cutoff,
                    anonymized_count=anonymized_count,
                    removed_refresh_count=removed_refresh_count,
                    dry_run=False,
                    trigger="scheduler",
                    status="success",
                )
                logger.info(
                    "audit_retention_run cutoff=%s anonymized=%s removed_refresh=%s",
                    cutoff.isoformat(),
                    anonymized_count,
                    removed_refresh_count,
                )
        except Exception:
            cutoff = datetime.utcnow() - timedelta(days=max(1, settings.AUDIT_RETENTION_DEFAULT_DAYS))
            record_audit_retention_metadata(
                db,
                run_at=datetime.utcnow(),
                cutoff=cutoff,
                anonymized_count=0,
                removed_refresh_count=0,
                dry_run=False,
                trigger="scheduler",
                status="error",
                error_message="Falha ao executar retenção automática de auditoria",
            )
            logger.exception("Falha ao executar retenção automática de auditoria")
        finally:
            db.close()

        await asyncio.sleep(interval_seconds)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print(f"Iniciando aplicacao {settings.APP_NAME}...")
    
    # Criar tabelas
    Base.metadata.create_all(bind=engine)
    print("Tabelas do banco de dados criadas!")

    # Garantir tenant padrão
    db = SessionLocal()
    try:
        _ensure_phase1_schema(db)
        default_tenant = db.query(Tenant).filter(Tenant.slug == settings.DEFAULT_TENANT_SLUG).first()
        if not default_tenant:
            default_tenant = Tenant(name="NexoCase Default", slug=settings.DEFAULT_TENANT_SLUG, is_active=True)
            db.add(default_tenant)
            db.commit()

        ensure_demo_data(db)
    finally:
        db.close()

    retention_task: asyncio.Task | None = None
    if settings.ENABLE_AUDIT_RETENTION_SCHEDULE:
        retention_task = asyncio.create_task(_audit_retention_scheduler())
    
    yield
    
    # Shutdown
    if retention_task:
        retention_task.cancel()
        try:
            await retention_task
        except asyncio.CancelledError:
            pass

    print(f"Encerrando aplicacao {settings.APP_NAME}...")


# Criar aplicação FastAPI
app = FastAPI(
    title=settings.APP_NAME,
    description=settings.APP_DESCRIPTION,
    version=settings.APP_VERSION,
    lifespan=lifespan
)


@app.middleware("http")
async def normalize_trailing_slash_middleware(request: Request, call_next):
    path = request.scope.get("path", "")
    if path and path != "/" and path.endswith("/"):
        request.scope["path"] = path.rstrip("/")
    return await call_next(request)

ALLOWED_NETWORK = ipaddress.ip_network(settings.ALLOWED_NETWORK_CIDR)


def _resolve_rate_limit(path: str) -> tuple[int, int, str]:
    if path == "/api/auth/login":
        return settings.RATE_LIMIT_LOGIN_REQUESTS, settings.RATE_LIMIT_LOGIN_WINDOW_SECONDS, "login"

    if path.startswith("/api/admin/export"):
        return settings.RATE_LIMIT_ADMIN_EXPORT_REQUESTS, settings.RATE_LIMIT_ADMIN_EXPORT_WINDOW_SECONDS, "admin_export"

    if path == "/api/admin/upload-logo":
        return settings.RATE_LIMIT_UPLOAD_LOGO_REQUESTS, settings.RATE_LIMIT_UPLOAD_LOGO_WINDOW_SECONDS, "upload_logo"

    return settings.RATE_LIMIT_DEFAULT_REQUESTS, settings.RATE_LIMIT_DEFAULT_WINDOW_SECONDS, "default"


def _extract_client_ip(request: Request) -> str:
    if settings.TRUST_PROXY_HEADERS:
        forwarded_for = request.headers.get("x-forwarded-for", "")
        if forwarded_for:
            first_ip = forwarded_for.split(",")[0].strip()
            if first_ip:
                return first_ip

        real_ip = request.headers.get("x-real-ip", "").strip()
        if real_ip:
            return real_ip

    if request.client and request.client.host:
        return request.client.host

    return ""


def _extract_host_ip(request: Request) -> str:
    host_header = request.headers.get("host", "")
    if host_header:
        return host_header.split(":")[0].strip()

    return ""


def _extract_tenant_slug(request: Request) -> str:
    header_name = (settings.TENANT_HEADER_NAME or "X-Tenant").lower()
    tenant_from_header = request.headers.get(header_name)
    if tenant_from_header:
        return tenant_from_header.strip().lower()

    host = request.headers.get("host", "")
    hostname = host.split(":")[0].strip().lower()
    if "." in hostname and hostname not in {"localhost", "127.0.0.1"}:
        subdomain = hostname.split(".")[0].strip()
        if subdomain and subdomain not in {"www", "api"}:
            return subdomain

    return settings.DEFAULT_TENANT_SLUG


@app.middleware("http")
async def restrict_ip_middleware(request: Request, call_next):
    if not settings.ENABLE_IP_RESTRICTION:
        return await call_next(request)

    client_host = _extract_client_ip(request)
    try:
        client_ip = ipaddress.ip_address(client_host)
    except ValueError:
        client_ip = None

    if client_ip and client_ip in ALLOWED_NETWORK:
        return await call_next(request)

    host_ip = _extract_host_ip(request)
    try:
        parsed_host_ip = ipaddress.ip_address(host_ip)
    except ValueError:
        parsed_host_ip = None

    if parsed_host_ip and parsed_host_ip in ALLOWED_NETWORK:
        return await call_next(request)

    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={"detail": "Forbidden"}
    )


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if not settings.RATE_LIMIT_ENABLED:
        return await call_next(request)

    limit, window_seconds, bucket = _resolve_rate_limit(request.url.path)
    now = time.monotonic()
    ip = _extract_client_ip(request) or "unknown"
    key = f"{bucket}:{ip}"
    timestamps = RATE_LIMIT_BUCKETS[key]

    while timestamps and now - timestamps[0] > window_seconds:
        timestamps.popleft()

    if len(timestamps) >= limit:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": "Muitas requisições. Tente novamente em instantes."}
        )

    timestamps.append(now)
    return await call_next(request)


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)

    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"
    response.headers["X-XSS-Protection"] = "0"
    response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"

    if settings.ENABLE_HSTS:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    return response


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    tenant_slug = _extract_tenant_slug(request)
    tenant_db = SessionLocal()
    tenant = tenant_db.query(Tenant).filter(Tenant.slug == tenant_slug, Tenant.is_active == True).first()
    if not tenant:
        tenant = tenant_db.query(Tenant).filter(Tenant.slug == settings.DEFAULT_TENANT_SLUG, Tenant.is_active == True).first()
    tenant_db.close()

    tenant_id = tenant.id if tenant else 1
    request.state.tenant_id = tenant_id
    request.state.tenant_slug = tenant.slug if tenant else settings.DEFAULT_TENANT_SLUG
    tenant_token = set_current_tenant_id(tenant_id)

    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    request_id_token = set_request_id(request_id)
    session_jti_token = set_session_jti(None)
    start_time = time.perf_counter()
    try:
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - start_time) * 1000

        response.headers["X-Request-ID"] = request_id
        logger.info(
            "request_id=%s method=%s path=%s status=%s duration_ms=%.2f ip=%s",
            request_id,
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
            _extract_client_ip(request),
        )
        return response
    finally:
        reset_current_tenant_id(tenant_token)
        reset_session_jti(session_jti_token)
        reset_request_id(request_id_token)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-CSRF-Token", "X-Tenant"],
)

# Registrar routers
app.include_router(auth.router)
app.include_router(incidents.router)
app.include_router(schools.router)
app.include_router(dashboard.router)
app.include_router(reports.router)
app.include_router(admin.router)
app.include_router(options.router)
app.include_router(tenant.router)
app.include_router(presets.router)

# Servir arquivos estáticos (logo, etc.)
static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.get("/")
async def root():
    return {
        "message": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "demo_mode": settings.DEMO_MODE,
        "docs": "/docs",
        "redoc": "/redoc"
    }


@app.get("/health")
async def health_check():
    now = datetime.utcnow()
    interval_hours = max(1, settings.AUDIT_RETENTION_INTERVAL_HOURS)
    max_expected_delay_hours = interval_hours * 2
    schedule_enabled = settings.ENABLE_AUDIT_RETENTION_SCHEDULE

    db = SessionLocal()
    try:
        metadata_keys = [
            "audit_retention_last_run_at",
            "audit_retention_last_status",
        ]
        metadata_rows = db.query(SystemConfig).filter(SystemConfig.key.in_(metadata_keys)).all()
        metadata = {row.key: row.value for row in metadata_rows}
    finally:
        db.close()

    last_run_raw = metadata.get("audit_retention_last_run_at")
    last_status = (metadata.get("audit_retention_last_status") or "").strip() or None

    last_run_at = None
    if last_run_raw:
        try:
            parsed = datetime.fromisoformat(last_run_raw.replace("Z", "+00:00"))
            if parsed.tzinfo is not None:
                parsed = parsed.astimezone(tz=None).replace(tzinfo=None)
            last_run_at = parsed
        except ValueError:
            last_run_at = None

    is_stale = False
    if schedule_enabled:
        if not last_run_at:
            is_stale = True
        else:
            elapsed_hours = (now - last_run_at).total_seconds() / 3600
            is_stale = elapsed_hours > max_expected_delay_hours

    if last_status == "error":
        overall_status = "degraded"
    elif schedule_enabled and is_stale:
        overall_status = "degraded"
    else:
        overall_status = "healthy"

    return {
        "status": overall_status,
        "service": "nexocase-backend",
        "demo_mode": settings.DEMO_MODE,
        "timestamp_utc": now.isoformat(),
        "retention": {
            "schedule_enabled": schedule_enabled,
            "interval_hours": interval_hours,
            "max_expected_delay_hours": max_expected_delay_hours,
            "last_run_at": last_run_at.isoformat() if last_run_at else None,
            "last_status": last_status,
            "is_stale": is_stale,
        },
    }
