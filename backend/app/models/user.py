from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SAEnum, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base
from app.utils.tenant import get_current_tenant_id_or_default


class UserRole(str, enum.Enum):
    MASTER = "MASTER"
    ADMIN = "ADMIN"
    CHEFIA = "CHEFIA"
    GESTOR_SETOR = "GESTOR_SETOR"
    DIRETOR = "DIRETOR"
    OPERADOR = "OPERADOR"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True, default=get_current_tenant_id_or_default)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(255), index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    must_change_password = Column(Boolean, default=False, nullable=False)
    temporary_password_issued_at = Column(DateTime, nullable=True)
    password_changed_at = Column(DateTime, nullable=True)
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime, nullable=True)
    last_login_at = Column(DateTime, nullable=True)
    token_version = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    role = Column(SAEnum(UserRole, name="user_role"), default=UserRole.DIRETOR, nullable=False)
    setor_vinculado = Column(String(100), nullable=True)
    escola_vinculada = Column(Integer, ForeignKey("schools.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relacionamento com incidentes
    incidents = relationship(
        "Incident",
        back_populates="operator",
        foreign_keys="Incident.operator_id",
    )
    validated_incidents = relationship(
        "Incident",
        back_populates="validator",
        foreign_keys="Incident.validated_by",
    )
    escola = relationship("School", foreign_keys=[escola_vinculada])
