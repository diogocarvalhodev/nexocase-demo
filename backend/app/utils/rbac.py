from typing import Any
from sqlalchemy.sql import false
from app.models.user import User, UserRole


def is_admin_or_master(user: User) -> bool:
    return user.role == UserRole.MASTER


def apply_incident_scope(query: Any, user: User, school_column: Any, sector_column: Any) -> Any:
    if user.role == UserRole.DIRETOR:
        if not user.escola_vinculada:
            return query.filter(false())
        return query.filter(school_column == user.escola_vinculada)

    if user.role == UserRole.GESTOR_SETOR:
        if not user.setor_vinculado:
            return query.filter(false())
        return query.filter(sector_column == user.setor_vinculado)

    return query


def can_access_incident(user: User, incident: Any) -> bool:
    if user.role == UserRole.DIRETOR:
        return incident.school_id == user.escola_vinculada

    if user.role == UserRole.GESTOR_SETOR:
        return incident.setor == user.setor_vinculado

    return True


def can_access_school(user: User, school_id: int) -> bool:
    if user.role == UserRole.DIRETOR:
        return user.escola_vinculada == school_id
    return True
