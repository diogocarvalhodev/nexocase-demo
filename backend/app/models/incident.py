from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base
from app.utils.tenant import get_current_tenant_id_or_default


class LocationEnum(str, enum.Enum):
    PORTAO = "Portão"
    PATIO = "Pátio"
    SECRETARIA = "Secretaria"
    COZINHA = "Cozinha"
    SALAS = "Salas"
    MURO = "Muro"
    OUTROS = "Outros"


class CategoryEnum(str, enum.Enum):
    INFRAESTRUTURA = "Infraestrutura"
    MEDIACAO = "Mediação"
    PEDAGOGICA = "Pedagógica"
    LOGISTICA = "Logística"
    SEGURANCA = "Segurança"
    CONFORMIDADE = "Conformidade"


class ImpactLevelEnum(str, enum.Enum):
    BAIXO = "Baixo"
    MEDIO = "Médio"
    ALTO = "Alto"


class StatusEnum(str, enum.Enum):
    AGUARDANDO_VALIDACAO = "Aguardando Validação"
    APROVADA = "Aprovada"
    FECHADO = "Fechado"
    REJEITADA = "Rejeitada"


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True, default=get_current_tenant_id_or_default)
    process_number = Column(String(50), unique=True, index=True, nullable=False)
    
    # Relacionamentos
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=False)
    operator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    unidade_escolar = Column(String(255), nullable=True)
    setor = Column(String(100), nullable=True)
    
    # Dados do incidente
    location = Column(String(50), nullable=False)
    category = Column(String(50), nullable=False)
    impact_level = Column(String(20), nullable=False)
    
    # Descrições
    description = Column(Text, nullable=False)
    actions_taken = Column(Text, nullable=True)
    
    # Status e controle
    status = Column(String(30), default=StatusEnum.FECHADO.value)
    is_archived = Column(Boolean, default=False)
    archived_at = Column(DateTime, nullable=True)
    validated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    validated_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    validation_note = Column(Text, nullable=True)
    
    # Arquivo PDF gerado
    pdf_path = Column(String(500), nullable=True)
    
    # Timestamps
    incident_date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    # Relacionamentos
    school = relationship("School", back_populates="incidents")
    operator = relationship(
        "User",
        back_populates="incidents",
        foreign_keys=[operator_id],
    )
    validator = relationship(
        "User",
        back_populates="validated_incidents",
        foreign_keys=[validated_by],
    )
