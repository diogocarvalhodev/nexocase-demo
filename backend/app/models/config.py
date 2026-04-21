from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base
from app.utils.tenant import get_current_tenant_id_or_default


class Category(Base):
    """Categorias de incidentes configuráveis."""
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True, default=get_current_tenant_id_or_default)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(7), default="#3B82F6")  # Hex color
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Location(Base):
    """Localizações internas das escolas configuráveis."""
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True, default=get_current_tenant_id_or_default)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ImpactLevel(Base):
    """Níveis de impacto configuráveis."""
    __tablename__ = "impact_levels"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True, default=get_current_tenant_id_or_default)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(7), default="#6B7280")  # Hex color
    severity = Column(Integer, default=1)  # 1=baixo, 2=médio, 3=alto, 4=crítico
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ActivityLog(Base):
    """Log de atividades do sistema."""
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True, default=get_current_tenant_id_or_default)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(50), nullable=False)  # CREATE, UPDATE, DELETE, ARCHIVE, LOGIN, etc.
    entity_type = Column(String(50), nullable=False)  # incident, school, user, category, etc.
    entity_id = Column(Integer, nullable=True)
    description = Column(Text, nullable=False)
    ip_address = Column(String(45), nullable=True)
    request_id = Column(String(36), nullable=True)
    session_jti = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relacionamento
    user = relationship("User", backref="activity_logs")


class SystemConfig(Base):
    """Configurações gerais do sistema."""
    __tablename__ = "system_config"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True, default=get_current_tenant_id_or_default)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
