from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.schemas.user import UserResponse
from app.schemas.school import SchoolResponse


class IncidentBase(BaseModel):
    school_id: int
    unidade_escolar: Optional[str] = None
    setor: Optional[str] = None
    location: str
    category: Optional[str] = None
    impact_level: str
    description: str
    actions_taken: Optional[str] = None


class IncidentCreate(IncidentBase):
    incident_date: Optional[datetime] = None


class IncidentUpdate(BaseModel):
    location: Optional[str] = None
    category: Optional[str] = None
    impact_level: Optional[str] = None
    description: Optional[str] = None
    actions_taken: Optional[str] = None
    status: Optional[str] = None
    unidade_escolar: Optional[str] = None
    setor: Optional[str] = None


class IncidentResponse(IncidentBase):
    id: int
    process_number: str
    operator_id: int
    status: str
    pdf_path: Optional[str] = None
    incident_date: datetime
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    validated_by: Optional[int] = None
    validated_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    validation_note: Optional[str] = None
    
    # Dados relacionados
    school: Optional[SchoolResponse] = None
    operator: Optional[UserResponse] = None
    validator: Optional[UserResponse] = None

    class Config:
        from_attributes = True


class IncidentStats(BaseModel):
    total_incidents: int
    open_incidents: int
    resolved_incidents: int
    by_category: dict
    by_school: dict
    by_operator: dict
    by_impact: dict


class IncidentPdfEdit(BaseModel):
    process_number: Optional[str] = None
    incident_date: Optional[str] = None
    unidade_escolar: Optional[str] = None
    endereco_escola: Optional[str] = None
    localizacao_interna: Optional[str] = None
    categoria: Optional[str] = None
    nivel_impacto: Optional[str] = None
    descricao: Optional[str] = None
    providencias: Optional[str] = None
    status: Optional[str] = None


class IncidentValidationNoteRequest(BaseModel):
    note: Optional[str] = None
