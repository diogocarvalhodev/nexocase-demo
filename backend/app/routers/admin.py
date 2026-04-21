from fastapi import APIRouter, Depends, HTTPException, status, Request, File, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta, timezone
import os
import base64
import shutil

from app.database import get_db
from app.config import settings
from app.models.user import User, UserRole
from app.models.incident import Incident
from app.models.refresh_token import RefreshToken
from app.models.school import School
from app.models.config import Category, Location, ImpactLevel, ActivityLog, SystemConfig
from app.schemas.admin import (
    CategoryCreate, CategoryUpdate, CategoryResponse,
    LocationCreate, LocationUpdate, LocationResponse,
    ImpactLevelCreate, ImpactLevelUpdate, ImpactLevelResponse,
    ActivityLogResponse, SystemConfigCreate, SystemConfigUpdate, SystemConfigResponse,
    ArchiveRequest, ArchiveResponse, AdminStatsResponse,
    AuditRetentionRequest, AuditRetentionRunResponse, AuditRetentionHealthResponse,
)
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.schemas.school import SchoolCreate, SchoolUpdate, SchoolResponse
from app.utils.auth import get_current_admin_user, get_password_hash
from app.utils.request_context import get_request_id, get_session_jti
from app.services.audit_retention import execute_audit_retention, resolve_retention_days, record_audit_retention_metadata

router = APIRouter(prefix="/api/admin", tags=["Administração"])


# ==================== UTILITY FUNCTIONS ====================

def log_activity(
    db: Session,
    user_id: int,
    action: str,
    entity_type: str,
    entity_id: Optional[int],
    description: str,
    ip_address: Optional[str] = None
):
    """Registrar atividade no log."""
    log = ActivityLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
        ip_address=ip_address,
        request_id=get_request_id(),
        session_jti=get_session_jti(),
    )
    db.add(log)
    db.commit()


def _parse_iso_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed


# ==================== STATS ====================

@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Obter estatísticas gerais do sistema."""
    return AdminStatsResponse(
        total_users=db.query(User).count(),
        active_users=db.query(User).filter(User.is_active == True).count(),
        total_schools=db.query(School).count(),
        active_schools=db.query(School).filter(School.is_active == True).count(),
        total_incidents=db.query(Incident).filter(Incident.is_archived == False).count(),
        archived_incidents=db.query(Incident).filter(Incident.is_archived == True).count(),
        total_categories=db.query(Category).filter(Category.is_active == True).count(),
        total_locations=db.query(Location).filter(Location.is_active == True).count(),
        total_impact_levels=db.query(ImpactLevel).filter(ImpactLevel.is_active == True).count()
    )


# ==================== CATEGORIES ====================

@router.get("/categories", response_model=List[CategoryResponse])
async def list_categories(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Listar todas as categorias."""
    query = db.query(Category)
    if not include_inactive:
        query = query.filter(Category.is_active == True)
    return query.order_by(Category.name).all()


@router.post("/categories", response_model=CategoryResponse)
async def create_category(
    category_data: CategoryCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Criar nova categoria."""
    existing = db.query(Category).filter(Category.name == category_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Categoria já existe")
    
    category = Category(**category_data.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    
    log_activity(db, current_admin.id, "CREATE", "category", category.id, 
                 f"Criou categoria: {category.name}", request.client.host if request.client else None)
    
    return category


@router.put("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int,
    category_data: CategoryUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Atualizar categoria."""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    update_data = category_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(category, key, value)
    
    db.commit()
    db.refresh(category)
    
    log_activity(db, current_admin.id, "UPDATE", "category", category.id,
                 f"Atualizou categoria: {category.name}", request.client.host if request.client else None)
    
    return category


@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Excluir categoria (soft delete)."""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    category.is_active = False
    db.commit()
    
    log_activity(db, current_admin.id, "DELETE", "category", category.id,
                 f"Desativou categoria: {category.name}", request.client.host if request.client else None)
    
    return {"message": "Categoria desativada com sucesso"}


# ==================== LOCATIONS ====================

@router.get("/locations", response_model=List[LocationResponse])
async def list_locations(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Listar todas as localizações."""
    query = db.query(Location)
    if not include_inactive:
        query = query.filter(Location.is_active == True)
    return query.order_by(Location.name).all()


@router.post("/locations", response_model=LocationResponse)
async def create_location(
    location_data: LocationCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Criar nova localização."""
    existing = db.query(Location).filter(Location.name == location_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Localização já existe")
    
    location = Location(**location_data.model_dump())
    db.add(location)
    db.commit()
    db.refresh(location)
    
    log_activity(db, current_admin.id, "CREATE", "location", location.id,
                 f"Criou localização: {location.name}", request.client.host if request.client else None)
    
    return location


@router.put("/locations/{location_id}", response_model=LocationResponse)
async def update_location(
    location_id: int,
    location_data: LocationUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Atualizar localização."""
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Localização não encontrada")
    
    update_data = location_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(location, key, value)
    
    db.commit()
    db.refresh(location)
    
    log_activity(db, current_admin.id, "UPDATE", "location", location.id,
                 f"Atualizou localização: {location.name}", request.client.host if request.client else None)
    
    return location


@router.delete("/locations/{location_id}")
async def delete_location(
    location_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Excluir localização (soft delete)."""
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Localização não encontrada")
    
    location.is_active = False
    db.commit()
    
    log_activity(db, current_admin.id, "DELETE", "location", location.id,
                 f"Desativou localização: {location.name}", request.client.host if request.client else None)
    
    return {"message": "Localização desativada com sucesso"}


# ==================== IMPACT LEVELS ====================

@router.get("/impact-levels", response_model=List[ImpactLevelResponse])
async def list_impact_levels(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Listar todos os níveis de impacto."""
    query = db.query(ImpactLevel)
    if not include_inactive:
        query = query.filter(ImpactLevel.is_active == True)
    return query.order_by(ImpactLevel.severity).all()


@router.post("/impact-levels", response_model=ImpactLevelResponse)
async def create_impact_level(
    level_data: ImpactLevelCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Criar novo nível de impacto."""
    existing = db.query(ImpactLevel).filter(ImpactLevel.name == level_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Nível de impacto já existe")
    
    level = ImpactLevel(**level_data.model_dump())
    db.add(level)
    db.commit()
    db.refresh(level)
    
    log_activity(db, current_admin.id, "CREATE", "impact_level", level.id,
                 f"Criou nível de impacto: {level.name}", request.client.host if request.client else None)
    
    return level


@router.put("/impact-levels/{level_id}", response_model=ImpactLevelResponse)
async def update_impact_level(
    level_id: int,
    level_data: ImpactLevelUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Atualizar nível de impacto."""
    level = db.query(ImpactLevel).filter(ImpactLevel.id == level_id).first()
    if not level:
        raise HTTPException(status_code=404, detail="Nível de impacto não encontrado")
    
    update_data = level_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(level, key, value)
    
    db.commit()
    db.refresh(level)
    
    log_activity(db, current_admin.id, "UPDATE", "impact_level", level.id,
                 f"Atualizou nível de impacto: {level.name}", request.client.host if request.client else None)
    
    return level


@router.delete("/impact-levels/{level_id}")
async def delete_impact_level(
    level_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Excluir nível de impacto (soft delete)."""
    level = db.query(ImpactLevel).filter(ImpactLevel.id == level_id).first()
    if not level:
        raise HTTPException(status_code=404, detail="Nível de impacto não encontrado")
    
    level.is_active = False
    db.commit()
    
    log_activity(db, current_admin.id, "DELETE", "impact_level", level.id,
                 f"Desativou nível de impacto: {level.name}", request.client.host if request.client else None)
    
    return {"message": "Nível de impacto desativado com sucesso"}


# ==================== SCHOOLS (Enhanced) ====================

@router.get("/schools", response_model=List[SchoolResponse])
async def list_schools_admin(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Listar todas as escolas com contagem de incidentes."""
    query = db.query(School)
    if not include_inactive:
        query = query.filter(School.is_active == True)
    
    schools = query.order_by(School.name).all()
    
    # Adicionar contagem de incidentes
    result = []
    for school in schools:
        school_dict = {
            "id": school.id,
            "name": school.name,
            "address": school.address,
            "phone": school.phone,
            "email": school.email,
            "is_active": school.is_active,
            "incident_count": db.query(Incident).filter(
                Incident.school_id == school.id,
                Incident.is_archived == False
            ).count()
        }
        result.append(SchoolResponse(**school_dict))
    
    return result


@router.post("/schools", response_model=SchoolResponse)
async def create_school(
    school_data: SchoolCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Criar nova escola."""
    existing = db.query(School).filter(School.name == school_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Escola já cadastrada")
    
    school = School(**school_data.model_dump())
    db.add(school)
    db.commit()
    db.refresh(school)
    
    log_activity(db, current_admin.id, "CREATE", "school", school.id,
                 f"Criou escola: {school.name}", request.client.host if request.client else None)
    
    return SchoolResponse(
        id=school.id,
        name=school.name,
        address=school.address,
        phone=school.phone,
        email=school.email,
        is_active=school.is_active,
        incident_count=0
    )


@router.put("/schools/{school_id}", response_model=SchoolResponse)
async def update_school(
    school_id: int,
    school_data: SchoolUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Atualizar escola."""
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="Escola não encontrada")
    
    update_data = school_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(school, key, value)
    
    db.commit()
    db.refresh(school)
    
    log_activity(db, current_admin.id, "UPDATE", "school", school.id,
                 f"Atualizou escola: {school.name}", request.client.host if request.client else None)
    
    incident_count = db.query(Incident).filter(
        Incident.school_id == school.id,
        Incident.is_archived == False
    ).count()
    
    return SchoolResponse(
        id=school.id,
        name=school.name,
        address=school.address,
        phone=school.phone,
        email=school.email,
        is_active=school.is_active,
        incident_count=incident_count
    )


@router.delete("/schools/{school_id}")
async def delete_school(
    school_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Excluir escola (soft delete)."""
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="Escola não encontrada")
    
    # Verificar se há incidentes ativos
    active_incidents = db.query(Incident).filter(
        Incident.school_id == school_id,
        Incident.is_archived == False
    ).count()
    
    if active_incidents > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Não é possível desativar escola com {active_incidents} incidente(s) ativo(s)"
        )
    
    school.is_active = False
    db.commit()
    
    log_activity(db, current_admin.id, "DELETE", "school", school.id,
                 f"Desativou escola: {school.name}", request.client.host if request.client else None)
    
    return {"message": "Escola desativada com sucesso"}


# ==================== USERS ====================

@router.get("/users", response_model=List[UserResponse])
async def list_users(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Listar todos os usuários."""
    query = db.query(User)
    if not include_inactive:
        query = query.filter(User.is_active == True)
    return query.order_by(User.full_name).all()


@router.post("/users", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Criar novo usuário."""
    existing_username = db.query(User).filter(User.username == user_data.username).first()
    if existing_username:
        raise HTTPException(status_code=400, detail="Usuário já cadastrado")
    
    role = user_data.role
    if role in {UserRole.ADMIN, UserRole.MASTER}:
        raise HTTPException(status_code=400, detail="Perfil não permitido")

    if role != UserRole.OPERADOR:
        existing_email = db.query(User).filter(User.email == user_data.email).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="E-mail já cadastrado")

    user = User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=get_password_hash(user_data.password),
        must_change_password=True,
        temporary_password_issued_at=datetime.utcnow(),
        is_admin=False,
        role=role,
        setor_vinculado=user_data.setor_vinculado,
        escola_vinculada=user_data.escola_vinculada
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    log_activity(db, current_admin.id, "CREATE", "user", user.id,
                 f"Criou usuário: {user.username}", request.client.host if request.client else None)
    
    return user


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Atualizar usuário."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    update_data = user_data.model_dump(exclude_unset=True)

    target_username = update_data.get("username", user.username)
    if target_username != user.username:
        existing_username = db.query(User).filter(User.username == target_username).first()
        if existing_username and existing_username.id != user.id:
            raise HTTPException(status_code=400, detail="Usuário já cadastrado")
    
    # Se estiver atualizando senha, fazer hash
    if "password" in update_data and update_data["password"]:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
        update_data["must_change_password"] = True
        update_data["temporary_password_issued_at"] = datetime.utcnow()
        update_data["password_changed_at"] = None
        update_data["failed_login_attempts"] = 0
        update_data["locked_until"] = None
        update_data["token_version"] = (user.token_version or 0) + 1
    elif "password" in update_data:
        del update_data["password"]

    if "role" in update_data and update_data["role"]:
        if update_data["role"] in {UserRole.ADMIN, UserRole.MASTER}:
            if user.role == UserRole.MASTER and update_data["role"] == UserRole.MASTER:
                update_data["is_admin"] = user.is_admin
            else:
                raise HTTPException(status_code=400, detail="Perfil não permitido")
        else:
            update_data["is_admin"] = False
    elif "is_admin" in update_data:
        update_data["is_admin"] = user.is_admin if user.role == UserRole.MASTER else False

    target_role = update_data.get("role", user.role)
    target_email = update_data.get("email", user.email)
    if target_role != UserRole.OPERADOR and target_email:
        existing_email = db.query(User).filter(User.email == target_email).first()
        if existing_email and existing_email.id != user.id:
            raise HTTPException(status_code=400, detail="E-mail já cadastrado")
    
    for key, value in update_data.items():
        setattr(user, key, value)
    
    db.commit()
    db.refresh(user)
    
    log_activity(db, current_admin.id, "UPDATE", "user", user.id,
                 f"Atualizou usuário: {user.username}", request.client.host if request.client else None)
    
    return user


@router.post("/users/{user_id}/unlock", response_model=UserResponse)
async def unlock_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Desbloquear conta de usuário após lockout."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()
    db.refresh(user)

    log_activity(
        db,
        current_admin.id,
        "UNLOCK",
        "user",
        user.id,
        f"Desbloqueou usuário: {user.username}",
        request.client.host if request.client else None,
    )

    return user


@router.delete("/users/permanent")
async def delete_users_permanently(
    user_ids: List[int],
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Excluir usuários permanentemente."""
    target_ids = list({int(user_id) for user_id in user_ids if user_id})
    if not target_ids:
        raise HTTPException(status_code=400, detail="Informe ao menos um usuário para excluir")

    if current_admin.id in target_ids:
        raise HTTPException(status_code=400, detail="Não é possível excluir o próprio usuário")

    users = db.query(User).filter(User.id.in_(target_ids)).all()
    if not users:
        raise HTTPException(status_code=404, detail="Usuários não encontrados")

    protected_masters = [user.username for user in users if user.role == UserRole.MASTER]
    if protected_masters:
        raise HTTPException(
            status_code=400,
            detail=f"Não é permitido excluir usuário(s) MASTER: {', '.join(protected_masters)}"
        )

    users_with_incidents: list[str] = []
    for user in users:
        incident_refs = db.query(Incident).filter(Incident.operator_id == user.id).count()
        validation_refs = db.query(Incident).filter(Incident.validated_by == user.id).count()
        if incident_refs > 0 or validation_refs > 0:
            users_with_incidents.append(user.username)

    if users_with_incidents:
        raise HTTPException(
            status_code=400,
            detail=(
                "Não é possível excluir usuário(s) com ocorrências vinculadas: "
                f"{', '.join(users_with_incidents)}"
            )
        )

    db.query(RefreshToken).filter(RefreshToken.user_id.in_(target_ids)).delete(synchronize_session=False)
    db.query(ActivityLog).filter(ActivityLog.user_id.in_(target_ids)).delete(synchronize_session=False)
    db.query(SystemConfig).filter(SystemConfig.updated_by.in_(target_ids)).update(
        {SystemConfig.updated_by: None},
        synchronize_session=False,
    )

    deleted_count = db.query(User).filter(User.id.in_(target_ids)).delete(synchronize_session=False)
    db.commit()

    log_activity(
        db,
        current_admin.id,
        "PERMANENT_DELETE",
        "user",
        None,
        f"Excluiu permanentemente {deleted_count} usuário(s)",
        request.client.host if request.client else None,
    )

    return {"message": f"{deleted_count} usuário(s) excluído(s) permanentemente"}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Desativar usuário (soft delete)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="Não é possível desativar seu próprio usuário")
    
    user.is_active = False
    user.token_version = (user.token_version or 0) + 1
    db.commit()
    
    log_activity(db, current_admin.id, "DELETE", "user", user.id,
                 f"Desativou usuário: {user.username}", request.client.host if request.client else None)
    
    return {"message": "Usuário desativado com sucesso"}


# ==================== ARCHIVE INCIDENTS ====================

@router.post("/incidents/archive", response_model=ArchiveResponse)
async def archive_incidents(
    archive_data: ArchiveRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Arquivar incidentes em massa."""
    query = db.query(Incident).filter(Incident.is_archived == False)
    
    if archive_data.incident_ids:
        query = query.filter(Incident.id.in_(archive_data.incident_ids))
    elif archive_data.start_date and archive_data.end_date:
        query = query.filter(
            Incident.incident_date >= archive_data.start_date,
            Incident.incident_date <= archive_data.end_date
        )
    elif archive_data.archive_all:
        pass  # Arquivar todos
    else:
        raise HTTPException(
            status_code=400,
            detail="Especifique IDs, período ou archive_all=true"
        )
    
    incidents = query.all()
    count = len(incidents)
    
    for incident in incidents:
        incident.is_archived = True
        incident.archived_at = datetime.utcnow()
    
    db.commit()
    
    log_activity(db, current_admin.id, "ARCHIVE", "incident", None,
                 f"Arquivou {count} incidente(s)", request.client.host if request.client else None)
    
    return ArchiveResponse(
        archived_count=count,
        message=f"{count} incidente(s) arquivado(s) com sucesso"
    )


@router.post("/incidents/unarchive")
async def unarchive_incidents(
    incident_ids: List[int],
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Desarquivar incidentes."""
    incidents = db.query(Incident).filter(
        Incident.id.in_(incident_ids),
        Incident.is_archived == True
    ).all()
    
    count = len(incidents)
    for incident in incidents:
        incident.is_archived = False
        incident.archived_at = None
    
    db.commit()
    
    log_activity(db, current_admin.id, "UNARCHIVE", "incident", None,
                 f"Desarquivou {count} incidente(s)", request.client.host if request.client else None)
    
    return {"message": f"{count} incidente(s) restaurado(s)"}


@router.delete("/incidents/permanent")
async def delete_incidents_permanently(
    incident_ids: List[int],
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Excluir incidentes permanentemente (apenas arquivados)."""
    incidents = db.query(Incident).filter(
        Incident.id.in_(incident_ids),
        Incident.is_archived == True
    ).all()
    
    count = len(incidents)
    for incident in incidents:
        db.delete(incident)
    
    db.commit()
    
    log_activity(db, current_admin.id, "PERMANENT_DELETE", "incident", None,
                 f"Excluiu permanentemente {count} incidente(s)", request.client.host if request.client else None)
    
    return {"message": f"{count} incidente(s) excluído(s) permanentemente"}


# ==================== ACTIVITY LOGS ====================

@router.get("/activity-logs", response_model=List[ActivityLogResponse])
async def list_activity_logs(
    limit: int = 100,
    entity_type: Optional[str] = None,
    action: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Listar logs de atividade."""
    query = db.query(ActivityLog)
    
    if entity_type:
        query = query.filter(ActivityLog.entity_type == entity_type)
    if action:
        query = query.filter(ActivityLog.action == action)
    
    logs = query.order_by(ActivityLog.created_at.desc()).limit(limit).all()
    
    result = []
    for log in logs:
        user = db.query(User).filter(User.id == log.user_id).first()
        result.append(ActivityLogResponse(
            id=log.id,
            user_id=log.user_id,
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            description=log.description,
            ip_address=log.ip_address,
            request_id=log.request_id,
            session_jti=log.session_jti,
            created_at=log.created_at,
            user_name=user.full_name if user else None
        ))
    
    return result


@router.post("/maintenance/audit-retention", response_model=AuditRetentionRunResponse)
async def run_audit_retention(
    payload: AuditRetentionRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """Aplicar retenção de auditoria: anonimizar trilhas antigas e remover sessões antigas."""
    retention_days = resolve_retention_days(db, payload.retention_days, 365)

    if retention_days <= 0:
        raise HTTPException(status_code=400, detail="retention_days deve ser maior que zero")

    cutoff, anonymized_count, removed_refresh_count = execute_audit_retention(
        db,
        retention_days,
        payload.dry_run,
    )

    record_audit_retention_metadata(
        db,
        run_at=datetime.utcnow(),
        cutoff=cutoff,
        anonymized_count=anonymized_count,
        removed_refresh_count=removed_refresh_count,
        dry_run=payload.dry_run,
        trigger="manual",
        status="success",
        updated_by=current_admin.id,
    )

    if not payload.dry_run:
        log_activity(
            db,
            current_admin.id,
            "MAINTENANCE",
            "audit",
            None,
            f"Executou retenção de auditoria (dias={retention_days}, anonimizações={anonymized_count}, refresh_removidos={removed_refresh_count})",
            request.client.host if request.client else None,
        )

    return AuditRetentionRunResponse(
        retention_days=retention_days,
        cutoff_utc=cutoff,
        anonymized_activity_logs=anonymized_count,
        removed_refresh_tokens=removed_refresh_count,
        dry_run=payload.dry_run,
    )


@router.get("/maintenance/health-retention", response_model=AuditRetentionHealthResponse)
async def get_audit_retention_health(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """Retorna saúde da rotina de retenção de auditoria para monitoramento administrativo."""
    metadata_keys = [
        "audit_retention_last_run_at",
        "audit_retention_last_status",
        "audit_retention_last_error",
    ]
    metadata_rows = db.query(SystemConfig).filter(SystemConfig.key.in_(metadata_keys)).all()
    metadata = {row.key: row.value for row in metadata_rows}

    now = datetime.utcnow()
    interval_hours = max(1, settings.AUDIT_RETENTION_INTERVAL_HOURS)
    max_expected_delay_hours = interval_hours * 2
    schedule_enabled = settings.ENABLE_AUDIT_RETENTION_SCHEDULE

    last_run_at = _parse_iso_datetime(metadata.get("audit_retention_last_run_at"))
    last_status = metadata.get("audit_retention_last_status") or None
    last_error = (metadata.get("audit_retention_last_error") or "").strip() or None
    next_expected_run_at = last_run_at + timedelta(hours=interval_hours) if last_run_at else None

    is_stale = False
    if schedule_enabled:
        if not last_run_at:
            is_stale = True
        else:
            elapsed_hours = (now - last_run_at).total_seconds() / 3600
            is_stale = elapsed_hours > max_expected_delay_hours

    if last_status == "error":
        status_value = "critical"
        message = "Última execução de retenção terminou com erro"
    elif schedule_enabled and not last_run_at:
        status_value = "warning"
        message = "Ainda não há execução registrada da rotina de retenção"
    elif schedule_enabled and is_stale:
        status_value = "warning"
        message = "Rotina de retenção está atrasada"
    elif not schedule_enabled:
        status_value = "info"
        message = "Rotina automática de retenção está desativada"
    else:
        status_value = "healthy"
        message = "Rotina de retenção dentro da janela esperada"

    return AuditRetentionHealthResponse(
        status=status_value,
        message=message,
        schedule_enabled=schedule_enabled,
        interval_hours=interval_hours,
        max_expected_delay_hours=max_expected_delay_hours,
        is_stale=is_stale,
        last_run_at=last_run_at,
        next_expected_run_at=next_expected_run_at,
        last_status=last_status,
        last_error=last_error,
    )


# ==================== SYSTEM CONFIG ====================

@router.get("/config", response_model=List[SystemConfigResponse])
async def list_system_config(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Listar configurações do sistema."""
    return db.query(SystemConfig).all()


@router.get("/config/{key}", response_model=SystemConfigResponse)
async def get_config(
    key: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Obter configuração específica."""
    config = db.query(SystemConfig).filter(SystemConfig.key == key).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuração não encontrada")
    return config


@router.put("/config/{key}", response_model=SystemConfigResponse)
async def update_config(
    key: str,
    config_data: SystemConfigUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Atualizar ou criar configuração."""
    config = db.query(SystemConfig).filter(SystemConfig.key == key).first()
    
    if not config:
        config = SystemConfig(key=key, updated_by=current_admin.id)
        db.add(config)
    
    update_data = config_data.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(config, k, v)
    
    config.updated_by = current_admin.id
    db.commit()
    db.refresh(config)
    
    log_activity(db, current_admin.id, "UPDATE", "config", config.id,
                 f"Atualizou configuração: {key}", request.client.host if request.client else None)
    
    return config


# ==================== DATA EXPORT ====================

@router.get("/export/incidents")
async def export_incidents_csv(
    request: Request,
    include_archived: bool = False,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Exportar incidentes em CSV."""
    from fastapi.responses import StreamingResponse
    import csv
    import io
    
    query = db.query(Incident)
    if not include_archived:
        query = query.filter(Incident.is_archived == False)
    
    incidents = query.order_by(Incident.incident_date.desc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "Processo", "Escola", "Data", "Categoria", "Localização", 
        "Impacto", "Descrição", "Providências", "Operador", "Arquivado"
    ])
    
    for inc in incidents:
        school = db.query(School).filter(School.id == inc.school_id).first()
        operator = db.query(User).filter(User.id == inc.operator_id).first()
        writer.writerow([
            inc.process_number,
            school.name if school else "",
            inc.incident_date.strftime("%d/%m/%Y %H:%M") if inc.incident_date else "",
            inc.category,
            inc.location,
            inc.impact_level,
            inc.description,
            inc.actions_taken or "",
            operator.full_name if operator else "",
            "Sim" if inc.is_archived else "Não"
        ])
    
    output.seek(0)

    log_activity(
        db,
        current_admin.id,
        "EXPORT",
        "incident",
        None,
        f"Exportou CSV de incidentes (include_archived={include_archived})",
        request.client.host if request.client else None,
    )
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=incidentes_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        }
    )


@router.get("/export/users")
async def export_users_csv(
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Exportar usuários em CSV."""
    from fastapi.responses import StreamingResponse
    import csv
    import io

    users = db.query(User).order_by(User.full_name).all()

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Nome", "Usuario", "Email", "Perfil", "Ativo", "Criado em"
    ])

    for user in users:
        writer.writerow([
            user.full_name,
            user.username,
            user.email,
            user.role.value if user.role else "",
            "Sim" if user.is_active else "Não",
            user.created_at.strftime("%d/%m/%Y %H:%M") if user.created_at else "",
        ])

    output.seek(0)

    log_activity(
        db,
        current_admin.id,
        "EXPORT",
        "user",
        None,
        "Exportou CSV de usuários",
        request.client.host if request.client else None,
    )

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=usuarios_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        }
    )


@router.get("/export/schools")
async def export_schools_csv(
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Exportar escolas em CSV."""
    from fastapi.responses import StreamingResponse
    import csv
    import io

    schools = db.query(School).order_by(School.name).all()

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Nome", "Endereco", "Telefone", "Email", "Ativa", "Ocorrencias"
    ])

    for school in schools:
        incident_count = db.query(Incident).filter(
            Incident.school_id == school.id,
            Incident.is_archived == False
        ).count()
        writer.writerow([
            school.name,
            school.address or "",
            school.phone or "",
            school.email or "",
            "Sim" if school.is_active else "Não",
            incident_count,
        ])

    output.seek(0)

    log_activity(
        db,
        current_admin.id,
        "EXPORT",
        "school",
        None,
        "Exportou CSV de escolas",
        request.client.host if request.client else None,
    )

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=escolas_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        }
    )


@router.get("/export/logs")
async def export_logs_csv(
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Exportar logs de atividade em CSV."""
    from fastapi.responses import StreamingResponse
    import csv
    import io

    logs = db.query(ActivityLog).order_by(ActivityLog.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Data/Hora", "Usuario", "Acao", "Entidade", "Descricao", "IP", "Request ID", "Session JTI"
    ])

    for log in logs:
        user = db.query(User).filter(User.id == log.user_id).first()
        writer.writerow([
            log.created_at.strftime("%d/%m/%Y %H:%M") if log.created_at else "",
            user.full_name if user else "",
            log.action,
            log.entity_type,
            log.description,
            log.ip_address or "",
            log.request_id or "",
            log.session_jti or "",
        ])

    output.seek(0)

    log_activity(
        db,
        current_admin.id,
        "EXPORT",
        "activity_log",
        None,
        "Exportou CSV de logs",
        request.client.host if request.client else None,
    )

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=logs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        }
    )


# ==================== LOGO UPLOAD ====================

LOGO_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "logo.png")


@router.post("/upload-logo")
async def upload_logo(
    file: UploadFile = File(...),
    request: Request = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Upload da logo institucional."""
    # Verificar tipo de arquivo
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Arquivo deve ser uma imagem")
    
    # Criar diretório se não existir
    os.makedirs(os.path.dirname(LOGO_PATH), exist_ok=True)
    
    # Salvar arquivo
    with open(LOGO_PATH, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    log_activity(db, current_admin.id, "UPDATE", "config", None,
                 "Atualizou logo institucional", request.client.host if request and request.client else None)
    
    return {"message": "Logo atualizada com sucesso", "path": "/static/logo.png"}


@router.get("/logo")
async def get_logo():
    """Obter logo institucional."""
    if os.path.exists(LOGO_PATH):
        return FileResponse(LOGO_PATH, media_type="image/png")
    raise HTTPException(status_code=404, detail="Logo não encontrada")


@router.get("/logo-base64")
async def get_logo_base64():
    """Obter logo em base64 para usar em templates."""
    if os.path.exists(LOGO_PATH):
        with open(LOGO_PATH, "rb") as f:
            logo_data = base64.b64encode(f.read()).decode()
        return {"logo_base64": f"data:image/png;base64,{logo_data}"}
    return {"logo_base64": None}
