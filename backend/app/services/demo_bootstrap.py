from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.config import settings
from app.models.config import ActivityLog, Category, ImpactLevel, Location, SystemConfig
from app.models.incident import Incident, StatusEnum
from app.models.school import School
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.utils.auth import get_password_hash


DEMO_SCHOOLS = [
    {
        "name": "North Campus",
        "address": "1200 Sentinel Ave, Austin, TX",
        "phone": "+1 512-555-0101",
        "email": "north-campus@example.demo",
    },
    {
        "name": "Operations Center",
        "address": "84 Harbor St, Austin, TX",
        "phone": "+1 512-555-0102",
        "email": "ops-center@example.demo",
    },
    {
        "name": "South Annex",
        "address": "18 Cedar Loop, Austin, TX",
        "phone": "+1 512-555-0103",
        "email": "south-annex@example.demo",
    },
]

DEMO_CATEGORIES = [
    ("Detection", "Automated and human-generated detections"),
    ("Access Control", "Authentication and privilege-related events"),
    ("Infrastructure", "Reliability and platform health incidents"),
    ("Safety", "Physical and operational safety events"),
]

DEMO_LOCATIONS = [
    ("SOC Console", "Central monitoring station"),
    ("Main Gate", "Primary access control zone"),
    ("Core Network", "Backbone services and connectivity"),
    ("Server Room", "Critical infrastructure area"),
]

DEMO_IMPACT_LEVELS = [
    ("Low", "Localized issue with no service disruption", "#22c55e", 1),
    ("Medium", "Requires operational follow-up", "#f59e0b", 2),
    ("High", "Business-impacting incident", "#ef4444", 3),
    ("Critical", "Immediate action required", "#7f1d1d", 4),
]

DEMO_USERS = [
    {
        "username": "admin",
        "email": "admin@nexocase.demo",
        "full_name": "Default Admin",
        "role": UserRole.MASTER,
        "password": "admin",
        "must_change_password": False,
    },
    {
        "username": "demo.admin",
        "email": "admin@example.demo",
        "full_name": "Portfolio Demo Admin",
        "role": UserRole.MASTER,
        "password": "DemoAdmin!234",
        "must_change_password": False,
    },
    {
        "username": "demo.lead",
        "email": "lead@example.demo",
        "full_name": "Incident Response Lead",
        "role": UserRole.CHEFIA,
        "password": "DemoLead!234",
        "must_change_password": False,
    },
    {
        "username": "demo.operator",
        "email": "operator@example.demo",
        "full_name": "SOC Operator",
        "role": UserRole.OPERADOR,
        "password": "DemoOperator!234",
        "must_change_password": False,
    },
    {
        "username": "demo.director",
        "email": "director@example.demo",
        "full_name": "Business Unit Director",
        "role": UserRole.DIRETOR,
        "password": "DemoDirector!234",
        "must_change_password": False,
    },
]


def _ensure_school(db: Session, tenant_id: int, payload: dict) -> School:
    school = db.query(School).filter(School.tenant_id == tenant_id, School.name == payload["name"]).first()
    if school:
        return school

    school = School(tenant_id=tenant_id, is_active=True, **payload)
    db.add(school)
    db.flush()
    return school


def _ensure_category(db: Session, tenant_id: int, name: str, description: str):
    existing = db.query(Category).filter(Category.tenant_id == tenant_id, Category.name == name).first()
    if existing:
        existing.description = description
        existing.is_active = True
        return

    db.add(Category(tenant_id=tenant_id, name=name, description=description, is_active=True))


def _ensure_location(db: Session, tenant_id: int, name: str, description: str):
    existing = db.query(Location).filter(Location.tenant_id == tenant_id, Location.name == name).first()
    if existing:
        existing.description = description
        existing.is_active = True
        return

    db.add(Location(tenant_id=tenant_id, name=name, description=description, is_active=True))


def _ensure_impact_level(db: Session, tenant_id: int, name: str, description: str, color: str, severity: int):
    existing = db.query(ImpactLevel).filter(ImpactLevel.tenant_id == tenant_id, ImpactLevel.name == name).first()
    if existing:
        existing.description = description
        existing.color = color
        existing.severity = severity
        existing.is_active = True
        return

    db.add(
        ImpactLevel(
            tenant_id=tenant_id,
            name=name,
            description=description,
            color=color,
            severity=severity,
            is_active=True,
        )
    )


def _ensure_user(db: Session, tenant_id: int, payload: dict, school_id: int | None = None) -> User:
    user = db.query(User).filter(User.tenant_id == tenant_id, User.username == payload["username"]).first()
    hashed_password = get_password_hash(payload["password"])
    issued_at = datetime.utcnow() - timedelta(days=1)
    if user:
        user.email = payload["email"]
        user.full_name = payload["full_name"]
        user.role = payload["role"]
        user.is_active = True
        user.is_admin = payload["role"] in {UserRole.MASTER, UserRole.ADMIN}
        user.must_change_password = payload["must_change_password"]
        user.hashed_password = hashed_password
        user.password_changed_at = issued_at
        user.temporary_password_issued_at = None
        if payload["role"] == UserRole.DIRETOR:
            user.escola_vinculada = school_id
        return user

    user = User(
        tenant_id=tenant_id,
        username=payload["username"],
        email=payload["email"],
        full_name=payload["full_name"],
        hashed_password=hashed_password,
        role=payload["role"],
        is_active=True,
        is_admin=payload["role"] in {UserRole.MASTER, UserRole.ADMIN},
        must_change_password=payload["must_change_password"],
        password_changed_at=issued_at,
        temporary_password_issued_at=None,
        escola_vinculada=school_id if payload["role"] == UserRole.DIRETOR else None,
    )
    db.add(user)
    db.flush()
    return user


def _ensure_config(db: Session, tenant_id: int, key: str, value: str, description: str | None = None):
    config = db.query(SystemConfig).filter(SystemConfig.tenant_id == tenant_id, SystemConfig.key == key).first()
    if config:
        config.value = value
        if description:
            config.description = description
        return

    db.add(SystemConfig(tenant_id=tenant_id, key=key, value=value, description=description))


def _seed_incidents(db: Session, tenant_id: int, schools: list[School], users: dict[str, User]):
    existing_count = db.query(Incident).filter(Incident.tenant_id == tenant_id).count()
    if existing_count > 0:
        return

    now = datetime.utcnow()
    operator = users["demo.operator"]
    lead = users["demo.lead"]
    director = users["demo.director"]

    incident_blueprints = [
        {
            "suffix": 1,
            "school": schools[0],
            "user": operator,
            "status": StatusEnum.FECHADO.value,
            "location": "SOC Console",
            "category": "Detection",
            "impact_level": "High",
            "description": "SIEM correlation flagged repeated failed VPN logins followed by a successful attempt from a new ASN.",
            "actions_taken": "Validated the source, rotated the credential, and documented the containment timeline.",
            "validated_by": lead.id,
            "validated_at": now - timedelta(days=5, hours=1),
            "resolved_at": now - timedelta(days=5),
            "incident_date": now - timedelta(days=5, hours=3),
            "created_at": now - timedelta(days=5, hours=2),
            "validation_note": "Escalated and closed after credential reset.",
        },
        {
            "suffix": 2,
            "school": schools[1],
            "user": operator,
            "status": StatusEnum.APROVADA.value,
            "location": "Core Network",
            "category": "Infrastructure",
            "impact_level": "Critical",
            "description": "Packet loss crossed the operational threshold on the primary uplink during peak activity.",
            "actions_taken": "Traffic shifted to backup path and synthetic checks were enabled for close monitoring.",
            "validated_by": lead.id,
            "validated_at": now - timedelta(days=2, hours=2),
            "incident_date": now - timedelta(days=2, hours=4),
            "created_at": now - timedelta(days=2, hours=3),
            "validation_note": "Keep under active observation until latency stabilizes.",
        },
        {
            "suffix": 3,
            "school": schools[2],
            "user": director,
            "status": StatusEnum.AGUARDANDO_VALIDACAO.value,
            "location": "Main Gate",
            "category": "Access Control",
            "impact_level": "Medium",
            "description": "Badge validation intermittently failed for contractors during shift change.",
            "actions_taken": "Temporary manual verification initiated and access list reviewed.",
            "incident_date": now - timedelta(hours=10),
            "created_at": now - timedelta(hours=9),
        },
        {
            "suffix": 4,
            "school": schools[0],
            "user": director,
            "status": StatusEnum.REJEITADA.value,
            "location": "Server Room",
            "category": "Safety",
            "impact_level": "Low",
            "description": "Noise alert reported by a local team member without supporting telemetry.",
            "actions_taken": "Cross-checked facility sensors and reviewed recent maintenance entries.",
            "validated_by": lead.id,
            "validated_at": now - timedelta(days=1, hours=2),
            "incident_date": now - timedelta(days=1, hours=4),
            "created_at": now - timedelta(days=1, hours=3),
            "validation_note": "Rejected due to insufficient evidence and no corroborating signal.",
            "rejection_reason": "No supporting logs or operational impact found.",
        },
    ]

    current_year = now.year
    for blueprint in incident_blueprints:
        process_number = f"{settings.PROCESS_NUMBER_PREFIX}/{current_year}/{blueprint['suffix']:05d}"
        db.add(
            Incident(
                tenant_id=tenant_id,
                process_number=process_number,
                school_id=blueprint["school"].id,
                operator_id=blueprint["user"].id,
                unidade_escolar=blueprint["school"].name,
                setor=blueprint["category"],
                location=blueprint["location"],
                category=blueprint["category"],
                impact_level=blueprint["impact_level"],
                description=blueprint["description"],
                actions_taken=blueprint["actions_taken"],
                status=blueprint["status"],
                validated_by=blueprint.get("validated_by"),
                validated_at=blueprint.get("validated_at"),
                validation_note=blueprint.get("validation_note"),
                rejection_reason=blueprint.get("rejection_reason"),
                resolved_at=blueprint.get("resolved_at"),
                incident_date=blueprint["incident_date"],
                created_at=blueprint["created_at"],
                updated_at=blueprint.get("validated_at") or blueprint["created_at"],
            )
        )


def _seed_activity_logs(db: Session, tenant_id: int, users: dict[str, User]):
    if db.query(ActivityLog).filter(ActivityLog.tenant_id == tenant_id).count() > 0:
        return

    now = datetime.utcnow()
    log_entries = [
        (users["demo.admin"].id, "LOGIN_SUCCESS", "auth", users["demo.admin"].id, "Administrator authenticated successfully", now - timedelta(hours=6)),
        (users["demo.operator"].id, "CREATE", "incident", 1, "Created incident from monitoring alert", now - timedelta(hours=5)),
        (users["demo.lead"].id, "UPDATE", "incident", 2, "Validated critical network incident", now - timedelta(hours=4)),
    ]

    for user_id, action, entity_type, entity_id, description, created_at in log_entries:
        db.add(
            ActivityLog(
                tenant_id=tenant_id,
                user_id=user_id,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                description=description,
                ip_address="127.0.0.1",
                request_id=f"demo-{action.lower()}-{user_id}",
                session_jti=f"demo-session-{user_id}",
                created_at=created_at,
            )
        )


def ensure_demo_data(db: Session):
    if not settings.DEMO_MODE or not settings.DEMO_AUTO_SEED:
        return

    tenant = db.query(Tenant).filter(Tenant.slug == settings.DEFAULT_TENANT_SLUG).first()
    if not tenant:
        tenant = Tenant(name="NexoCase Demo Tenant", slug=settings.DEFAULT_TENANT_SLUG, is_active=True)
        db.add(tenant)
        db.flush()

    tenant.name = "NexoCase Demo Tenant"
    tenant.business_type = "education"
    tenant.onboarding_completed = True
    tenant.onboarding_completed_at = tenant.onboarding_completed_at or datetime.utcnow()
    tenant.is_active = True
    tenant_id = tenant.id

    schools = [_ensure_school(db, tenant_id, payload) for payload in DEMO_SCHOOLS]

    for name, description in DEMO_CATEGORIES:
        _ensure_category(db, tenant_id, name, description)
    for name, description in DEMO_LOCATIONS:
        _ensure_location(db, tenant_id, name, description)
    for name, description, color, severity in DEMO_IMPACT_LEVELS:
        _ensure_impact_level(db, tenant_id, name, description, color, severity)

    users: dict[str, User] = {}
    primary_school_id = schools[0].id if schools else None
    for payload in DEMO_USERS:
        user = _ensure_user(db, tenant_id, payload, school_id=primary_school_id)
        users[payload["username"]] = user

    _ensure_config(db, tenant_id, f"tenant:{tenant_id}:ui.app_name", "NexoCase Demo", "Demo UI application name")
    _ensure_config(db, tenant_id, f"tenant:{tenant_id}:ui.subtitle", "Incident Operations and Security Workflow", "Demo UI subtitle")
    _ensure_config(db, tenant_id, f"tenant:{tenant_id}:ui.primary_color", "#0f766e")
    _ensure_config(db, tenant_id, f"tenant:{tenant_id}:ui.accent_color", "#f59e0b")

    _seed_incidents(db, tenant_id, schools, users)
    _seed_activity_logs(db, tenant_id, users)
    db.commit()