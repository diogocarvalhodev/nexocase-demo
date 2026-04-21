from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from uuid import uuid4
from app.config import settings
from app.database import get_db
from app.models.user import User, UserRole
from app.utils.request_context import set_session_jti

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if "jti" not in to_encode:
        to_encode["jti"] = uuid4().hex
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "token_type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> tuple[str, str, datetime]:
    to_encode = data.copy()
    jti = uuid4().hex
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode.update({"exp": expire, "token_type": "refresh", "jti": jti})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt, jti, expire


def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


async def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_token(token)
    if payload is None:
        raise credentials_exception
    
    username: str = payload.get("sub")
    if username is None:
        raise credentials_exception

    token_type = payload.get("token_type")
    if token_type != "access":
        raise credentials_exception

    token_tenant_id = payload.get("tid")
    request_tenant_id = getattr(request.state, "tenant_id", None)
    if request_tenant_id is not None and token_tenant_id is not None:
        if int(token_tenant_id) != int(request_tenant_id):
            raise credentials_exception

    token_jti = payload.get("jti")
    set_session_jti(token_jti if token_jti else None)
    request.state.session_jti = token_jti
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception

    token_version = payload.get("tv")
    if token_version is None or int(token_version) != int(user.token_version or 0):
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário inativo"
        )

    allowed_paths = {
        "/api/auth/change-password",
        "/api/auth/me",
    }
    request_path = request.url.path
    if user.must_change_password and request_path not in allowed_paths:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "PASSWORD_CHANGE_REQUIRED",
                "message": "Troca de senha obrigatória antes de acessar o sistema.",
            }
        )
    
    return user


async def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role != UserRole.MASTER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Privilégios de administrador necessários."
        )
    return current_user


async def get_current_report_editor(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role not in {UserRole.MASTER, UserRole.CHEFIA}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Privilégios de chefia necessários."
        )
    return current_user
