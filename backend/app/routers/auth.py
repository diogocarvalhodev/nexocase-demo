import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List

from app.database import get_db
from app.models.user import User, UserRole
from app.models.refresh_token import RefreshToken
from app.models.config import ActivityLog
from app.schemas.user import UserCreate, UserResponse, Token, PasswordChangeRequest, RefreshTokenResponse
from app.utils.auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    get_current_admin_user
)
from app.config import settings
from app.utils.request_context import get_request_id, get_session_jti
from app.utils.request_context import set_session_jti

router = APIRouter(prefix="/api/auth", tags=["Autenticação"])


def _is_password_expired(user: User) -> bool:
    reference_date = user.password_changed_at or user.temporary_password_issued_at or user.created_at
    if not reference_date:
        return False
    expires_at = reference_date + timedelta(days=settings.PASSWORD_MAX_AGE_DAYS)
    return datetime.utcnow() >= expires_at


def _extract_ip(request: Request | None) -> str | None:
    if not request:
        return None
    if request.client and request.client.host:
        return request.client.host
    return None


def _log_auth_event(
    db: Session,
    user_id: int,
    action: str,
    description: str,
    request: Request | None = None,
):
    db.add(ActivityLog(
        user_id=user_id,
        action=action,
        entity_type="auth",
        entity_id=user_id,
        description=description,
        ip_address=_extract_ip(request),
        request_id=(request.state.request_id if request and hasattr(request.state, "request_id") else get_request_id()),
        session_jti=(request.state.session_jti if request and hasattr(request.state, "session_jti") else get_session_jti()),
    ))
    db.commit()


def _generate_csrf_token() -> str:
    return secrets.token_urlsafe(32)


def _set_session_cookies(response: Response, refresh_token: str, csrf_token: str):
    response.set_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path=settings.REFRESH_COOKIE_PATH,
    )
    response.set_cookie(
        key=settings.CSRF_COOKIE_NAME,
        value=csrf_token,
        httponly=False,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/",
    )


def _clear_session_cookies(response: Response):
    response.delete_cookie(settings.REFRESH_COOKIE_NAME, path=settings.REFRESH_COOKIE_PATH)
    response.delete_cookie(settings.CSRF_COOKIE_NAME, path="/")


def _validate_csrf(request: Request):
    csrf_cookie = request.cookies.get(settings.CSRF_COOKIE_NAME)
    csrf_header = request.headers.get("x-csrf-token")

    if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Validação CSRF falhou",
        )


def _create_refresh_session(db: Session, user: User, request: Request | None) -> tuple[str, str]:
    refresh_token, jti, expires_at = create_refresh_token(data={"sub": user.username, "tid": user.tenant_id})
    db.add(RefreshToken(
        user_id=user.id,
        token_jti=jti,
        expires_at=expires_at,
        ip_address=_extract_ip(request),
        user_agent=request.headers.get("user-agent")[:512] if request else None,
    ))
    db.commit()
    return refresh_token, jti


@router.post("/login", response_model=Token)
async def login(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Autenticar usuário e retornar token JWT."""
    user = db.query(User).filter(User.username == form_data.username).first()

    if user and user.locked_until and user.locked_until > datetime.utcnow():
        _log_auth_event(db, user.id, "LOGIN_BLOCKED", "Tentativa de login em conta bloqueada", request)
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Conta temporariamente bloqueada por tentativas inválidas. Tente novamente mais tarde."
        )
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        if user:
            user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
            lock_applied = False
            if (
                settings.ACCOUNT_LOCKOUT_ENABLED
                and user.failed_login_attempts >= settings.MAX_FAILED_LOGIN_ATTEMPTS
            ):
                user.locked_until = datetime.utcnow() + timedelta(minutes=settings.ACCOUNT_LOCKOUT_MINUTES)
                lock_applied = True

            db.commit()
            db.refresh(user)

            event_desc = "Falha de login por senha inválida"
            if lock_applied:
                event_desc = f"Falha de login: conta bloqueada por {settings.ACCOUNT_LOCKOUT_MINUTES} minuto(s)"
            _log_auth_event(db, user.id, "LOGIN_FAILED", event_desc, request)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário inativo. Contate o administrador."
        )

    password_expired = _is_password_expired(user)
    if password_expired and not user.must_change_password:
        user.must_change_password = True

    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "tv": user.token_version or 0, "tid": user.tenant_id},
        expires_delta=access_token_expires
    )

    refresh_token, refresh_jti = _create_refresh_session(db, user, request)
    request.state.session_jti = refresh_jti
    set_session_jti(refresh_jti)
    csrf_token = _generate_csrf_token()
    _set_session_cookies(response, refresh_token, csrf_token)

    _log_auth_event(db, user.id, "LOGIN_SUCCESS", "Login realizado com sucesso", request)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "password_change_required": user.must_change_password or password_expired,
        "user": UserResponse.model_validate(user)
    }


@router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh_auth_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """Renovar sessão a partir de refresh token válido com rotação."""
    _validate_csrf(request)

    refresh_token = request.cookies.get(settings.REFRESH_COOKIE_NAME)
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token ausente")

    token_payload = decode_token(refresh_token)
    if token_payload is None or token_payload.get("token_type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token inválido")

    username = token_payload.get("sub")
    token_tenant_id = token_payload.get("tid")
    token_jti = token_payload.get("jti")
    if not username or not token_jti:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token inválido")

    request_tenant_id = getattr(request.state, "tenant_id", None)
    if request_tenant_id is not None and token_tenant_id is not None and int(request_tenant_id) != int(token_tenant_id):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token inválido")

    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário inválido")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuário inativo")

    current_session = db.query(RefreshToken).filter(
        RefreshToken.user_id == user.id,
        RefreshToken.token_jti == token_jti,
        RefreshToken.revoked_at.is_(None),
    ).first()

    if not current_session or current_session.expires_at <= datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão expirada ou revogada")

    access_token = create_access_token(data={"sub": user.username, "tv": user.token_version or 0, "tid": user.tenant_id})
    new_refresh_token, new_jti, new_expires_at = create_refresh_token(data={"sub": user.username, "tid": user.tenant_id})

    current_session.revoked_at = datetime.utcnow()
    current_session.replaced_by_jti = new_jti
    db.add(RefreshToken(
        user_id=user.id,
        token_jti=new_jti,
        expires_at=new_expires_at,
        ip_address=_extract_ip(request),
        user_agent=request.headers.get("user-agent")[:512] if request else None,
    ))
    db.commit()
    db.refresh(user)

    csrf_token = _generate_csrf_token()
    _set_session_cookies(response, new_refresh_token, csrf_token)
    request.state.session_jti = new_jti
    set_session_jti(new_jti)

    _log_auth_event(db, user.id, "REFRESH", "Sessão renovada por refresh token", request)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(user),
    }


@router.post("/register", response_model=UserResponse)
async def register(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Registrar novo usuário (apenas administradores)."""
    existing_username = db.query(User).filter(User.username == user_data.username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuário já cadastrado"
        )

    # Criar novo usuário
    role = user_data.role
    if user_data.is_admin and role == UserRole.DIRETOR:
        role = UserRole.ADMIN

    if role != UserRole.OPERADOR:
        existing_email = db.query(User).filter(User.email == user_data.email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="E-mail já cadastrado"
            )

    new_user = User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=get_password_hash(user_data.password),
        must_change_password=True,
        temporary_password_issued_at=datetime.utcnow(),
        is_admin=role in {UserRole.ADMIN, UserRole.MASTER},
        role=role,
        setor_vinculado=user_data.setor_vinculado,
        escola_vinculada=user_data.escola_vinculada
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Retornar dados do usuário autenticado."""
    return current_user


@router.post("/change-password", response_model=UserResponse)
async def change_password(
    payload: PasswordChangeRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Trocar senha do usuário autenticado."""
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Senha atual inválida"
        )

    if len(payload.new_password or "") < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A nova senha deve ter no mínimo 8 caracteres"
        )

    if verify_password(payload.new_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A nova senha deve ser diferente da senha atual"
        )

    current_user.hashed_password = get_password_hash(payload.new_password)
    current_user.must_change_password = False
    current_user.password_changed_at = datetime.utcnow()
    current_user.temporary_password_issued_at = None
    current_user.failed_login_attempts = 0
    current_user.locked_until = None
    current_user.token_version = (current_user.token_version or 0) + 1

    active_sessions = db.query(RefreshToken).filter(
        RefreshToken.user_id == current_user.id,
        RefreshToken.revoked_at.is_(None),
    ).all()
    for session in active_sessions:
        session.revoked_at = datetime.utcnow()

    db.commit()
    db.refresh(current_user)

    _log_auth_event(db, current_user.id, "PASSWORD_CHANGE", "Senha alterada pelo usuário", request)

    return current_user


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Registrar evento de logout."""
    _validate_csrf(request)

    active_sessions = db.query(RefreshToken).filter(
        RefreshToken.user_id == current_user.id,
        RefreshToken.revoked_at.is_(None),
    ).all()
    for session in active_sessions:
        session.revoked_at = datetime.utcnow()

    current_user.token_version = (current_user.token_version or 0) + 1

    db.commit()
    _clear_session_cookies(response)
    _log_auth_event(db, current_user.id, "LOGOUT", "Logout realizado", request)
    return {"message": "Logout registrado"}


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Listar todos os usuários (apenas administradores)."""
    return db.query(User).all()


@router.put("/users/{user_id}/toggle-active", response_model=UserResponse)
async def toggle_user_active(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Ativar/desativar usuário (apenas administradores)."""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )
    
    if user.id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Você não pode desativar a si mesmo"
        )
    
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    
    return user
