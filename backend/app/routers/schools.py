from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.school import School
from app.models.user import User, UserRole
from app.schemas.school import SchoolCreate, SchoolResponse
from app.utils.auth import get_current_user, get_current_admin_user
from app.utils.rbac import can_access_school

router = APIRouter(prefix="/api/schools", tags=["Escolas"])

# Lista de exemplo para ambiente novo (idempotente)
DEFAULT_SCHOOL_SEED = [
    {"name": "Unidade Central", "address": "Av. Principal, 100 - Centro"},
    {"name": "Unidade Norte", "address": "Rua das Flores, 220 - Zona Norte"},
    {"name": "Unidade Sul", "address": "Rua do Comercio, 45 - Zona Sul"},
    {"name": "Unidade Leste", "address": "Av. Industrial, 980 - Zona Leste"},
    {"name": "Unidade Oeste", "address": "Rua do Campo, 12 - Zona Oeste"},
]


@router.get("", response_model=List[SchoolResponse], include_in_schema=False)
@router.get("/", response_model=List[SchoolResponse])
async def list_schools(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Listar todas as escolas ativas."""
    query = db.query(School).filter(School.is_active == True)
    if current_user.role == UserRole.DIRETOR:
        if not current_user.escola_vinculada:
            return []
        query = query.filter(School.id == current_user.escola_vinculada)
    return query.order_by(School.name).all()


@router.get("/{school_id}", response_model=SchoolResponse)
async def get_school(
    school_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter detalhes de uma escola."""
    school = db.query(School).filter(School.id == school_id).first()
    
    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Escola não encontrada"
        )

    if not can_access_school(current_user, school_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Escola não encontrada"
        )
    
    return school


@router.post("", response_model=SchoolResponse, include_in_schema=False)
@router.post("/", response_model=SchoolResponse)
async def create_school(
    school_data: SchoolCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Criar nova escola (apenas administradores)."""
    new_school = School(**school_data.model_dump())
    db.add(new_school)
    db.commit()
    db.refresh(new_school)
    return new_school


@router.post("/seed", response_model=dict)
async def seed_schools(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Popular banco com unidades de exemplo (apenas administradores)."""
    count = 0
    for escola in DEFAULT_SCHOOL_SEED:
        existing = db.query(School).filter(School.name == escola["name"]).first()
        if not existing:
            new_school = School(**escola)
            db.add(new_school)
            count += 1
    
    db.commit()
    return {"message": f"{count} escolas adicionadas com sucesso"}


@router.put("/{school_id}", response_model=SchoolResponse)
async def update_school(
    school_id: int,
    school_data: SchoolCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Atualizar escola (apenas administradores)."""
    school = db.query(School).filter(School.id == school_id).first()
    
    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Escola não encontrada"
        )
    
    for key, value in school_data.model_dump().items():
        setattr(school, key, value)
    
    db.commit()
    db.refresh(school)
    return school


@router.delete("/{school_id}")
async def delete_school(
    school_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Desativar escola (apenas administradores)."""
    school = db.query(School).filter(School.id == school_id).first()
    
    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Escola não encontrada"
        )
    
    school.is_active = False
    db.commit()
    
    return {"message": "Escola desativada com sucesso"}
