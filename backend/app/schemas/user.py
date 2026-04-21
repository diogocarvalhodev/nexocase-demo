from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from app.models.user import UserRole


class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.DIRETOR
    setor_vinculado: Optional[str] = None
    escola_vinculada: Optional[int] = None


class UserCreate(UserBase):
    password: str
    is_admin: bool = False


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None
    role: Optional[UserRole] = None
    setor_vinculado: Optional[str] = None
    escola_vinculada: Optional[int] = None


class UserResponse(UserBase):
    id: int
    is_active: bool
    is_admin: bool
    must_change_password: bool
    failed_login_attempts: int
    locked_until: Optional[datetime] = None
    last_login_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    password_change_required: bool = False
    user: UserResponse


class TokenData(BaseModel):
    username: Optional[str] = None


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


class RefreshTokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
