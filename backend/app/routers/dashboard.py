from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, extract, or_
from typing import List, Optional
from datetime import datetime, timedelta
import re

from app.database import get_db
from app.models.incident import Incident, StatusEnum
from app.models.school import School
from app.models.user import User, UserRole
from app.utils.auth import get_current_user
from app.utils.rbac import apply_incident_scope

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


def _scoped_incidents(db: Session, user: User):
    base_query = db.query(Incident).filter(Incident.is_archived == False)
    return apply_incident_scope(base_query, user, Incident.school_id, Incident.setor)


def _apply_time_range(query, start: Optional[datetime], end: Optional[datetime]):
    if start:
        query = query.filter(Incident.incident_date >= start)
    if end:
        query = query.filter(Incident.incident_date < end)
    return query


def _apply_admin_setor(query, user: User, setor: Optional[str]):
    if setor and user.role == UserRole.MASTER:
        query = query.filter(or_(Incident.setor == setor, Incident.category == setor))
    return query


def _apply_common_filters(
    query,
    impact_level: Optional[str],
    school_id: Optional[int],
    operator_id: Optional[int]
):
    if impact_level:
        query = query.filter(Incident.impact_level == impact_level)
    if school_id:
        query = query.filter(Incident.school_id == school_id)
    if operator_id:
        query = query.filter(Incident.operator_id == operator_id)
    return query


def _apply_region_filter(query, region: Optional[str], school_joined: bool = False):
    if not region:
        return query
    if not school_joined:
        query = query.join(School, School.id == Incident.school_id)
    return query.filter(School.address.ilike(f"%{region}%"))


def _resolve_period(period: Optional[str], start_date: Optional[str], end_date: Optional[str]):
    if not period:
        return None, None

    now = datetime.now()
    period = period.lower()

    if period == "all":
        return None, None

    if period == "day":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        return start, now
    if period == "week":
        start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
        return start, now
    if period == "month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        return start, now
    if period == "year":
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        return start, now
    if period == "custom":
        start = datetime.strptime(start_date, "%Y-%m-%d") if start_date else None
        end = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1) if end_date else None
        return start, end

    return None, None


def extract_region_from_address(address: str) -> str:
    """Extrai regiao/bairro do endereco de forma generica."""
    if not address:
        return "Não informado"

    match = re.search(r" - ([^,]+)", address)
    if match:
        return match.group(1).strip()

    parts = [part.strip() for part in address.split(",") if part.strip()]
    if len(parts) >= 2:
        return parts[-2]
    
    return "Não informado"


@router.get("/stats")
async def get_dashboard_stats(
    period: Optional[str] = Query(None, description="day, week, month, year, custom"),
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD (custom)"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD (custom)"),
    setor: Optional[str] = Query(None, description="Filtro de setor para MASTER"),
    impact_level: Optional[str] = Query(None, description="Filtro de impacto"),
    school_id: Optional[int] = Query(None, description="Filtro de escola"),
    operator_id: Optional[int] = Query(None, description="Filtro de operador"),
    region: Optional[str] = Query(None, description="Filtro de regiao/bairro"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter estatísticas gerais do dashboard."""

    start, end = _resolve_period(period, start_date, end_date)
    base_scoped = _scoped_incidents(db, current_user)
    total_incidents = base_scoped.count()

    scoped = base_scoped
    scoped = _apply_time_range(scoped, start, end)
    scoped = _apply_admin_setor(scoped, current_user, setor)
    scoped = _apply_common_filters(scoped, impact_level, school_id, operator_id)
    scoped = _apply_region_filter(scoped, region)
    
    # Incidentes por status
    open_incidents = scoped.filter(
        Incident.status == StatusEnum.AGUARDANDO_VALIDACAO.value
    ).count()
    
    in_progress_incidents = scoped.filter(
        Incident.status == StatusEnum.APROVADA.value
    ).count()
    
    resolved_incidents = scoped.filter(
        Incident.status == StatusEnum.FECHADO.value
    ).count()

    rejected_incidents = scoped.filter(
        Incident.status == StatusEnum.REJEITADA.value
    ).count()
    
    # Incidentes no periodo (ou mês atual se sem filtro)
    if period:
        period_incidents = scoped.count()
    else:
        current_month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        period_scoped = _scoped_incidents(db, current_user).filter(Incident.incident_date >= current_month_start)
        period_scoped = _apply_admin_setor(period_scoped, current_user, setor)
        period_scoped = _apply_common_filters(period_scoped, impact_level, school_id, operator_id)
        period_scoped = _apply_region_filter(period_scoped, region)
        period_incidents = period_scoped.count()
    
    # Incidentes de alto impacto no periodo
    high_impact_open = scoped.filter(
        Incident.impact_level == "Alto"
    ).count()
    
    return {
        "total_incidents": total_incidents or 0,
        "open_incidents": open_incidents or 0,
        "in_progress_incidents": in_progress_incidents or 0,
        "resolved_incidents": resolved_incidents or 0,
        "rejected_incidents": rejected_incidents or 0,
        "monthly_incidents": period_incidents or 0,
        "high_impact_open": high_impact_open or 0
    }


@router.get("/incidents-by-category")
async def get_incidents_by_category(
    period: Optional[str] = Query(None, description="day, week, month, year, custom"),
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD (custom)"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD (custom)"),
    setor: Optional[str] = Query(None, description="Filtro de setor para MASTER"),
    impact_level: Optional[str] = Query(None, description="Filtro de impacto"),
    school_id: Optional[int] = Query(None, description="Filtro de escola"),
    operator_id: Optional[int] = Query(None, description="Filtro de operador"),
    region: Optional[str] = Query(None, description="Filtro de regiao/bairro"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter distribuição de incidentes por setor."""

    start, end = _resolve_period(period, start_date, end_date)
    query = _scoped_incidents(db, current_user)
    query = _apply_time_range(query, start, end)
    query = _apply_admin_setor(query, current_user, setor)
    query = _apply_common_filters(query, impact_level, school_id, operator_id)
    query = _apply_region_filter(query, region)
    
    results = query.with_entities(
        func.coalesce(Incident.setor, Incident.category).label("setor"),
        func.count(Incident.id).label("count")
    ).group_by(func.coalesce(Incident.setor, Incident.category)).all()
    
    return [{"setor": r.setor, "count": r.count} for r in results]


@router.get("/incidents-by-school")
async def get_incidents_by_school(
    limit: int = 10,
    period: Optional[str] = Query(None, description="day, week, month, year, custom"),
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD (custom)"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD (custom)"),
    setor: Optional[str] = Query(None, description="Filtro de setor para MASTER"),
    impact_level: Optional[str] = Query(None, description="Filtro de impacto"),
    school_id: Optional[int] = Query(None, description="Filtro de escola"),
    operator_id: Optional[int] = Query(None, description="Filtro de operador"),
    region: Optional[str] = Query(None, description="Filtro de regiao/bairro"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter escolas com mais ocorrências."""

    start, end = _resolve_period(period, start_date, end_date)
    base_query = apply_incident_scope(
        db.query(
            School.name,
            func.count(Incident.id).label("count")
        ).join(Incident, School.id == Incident.school_id
        ).filter(Incident.is_archived == False
        ).group_by(School.id, School.name
        ).order_by(desc("count")),
        current_user,
        Incident.school_id,
        Incident.setor
    )
    base_query = _apply_time_range(base_query, start, end)
    base_query = _apply_admin_setor(base_query, current_user, setor)
    base_query = _apply_common_filters(base_query, impact_level, school_id, operator_id)
    base_query = _apply_region_filter(base_query, region, school_joined=True)
    results = base_query.limit(limit).all()
    
    return [{"school": r.name, "count": r.count} for r in results]


@router.get("/incidents-by-impact")
async def get_incidents_by_impact(
    period: Optional[str] = Query(None, description="day, week, month, year, custom"),
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD (custom)"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD (custom)"),
    setor: Optional[str] = Query(None, description="Filtro de setor para MASTER"),
    impact_level: Optional[str] = Query(None, description="Filtro de impacto"),
    school_id: Optional[int] = Query(None, description="Filtro de escola"),
    operator_id: Optional[int] = Query(None, description="Filtro de operador"),
    region: Optional[str] = Query(None, description="Filtro de regiao/bairro"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter distribuição de incidentes por nível de impacto."""

    start, end = _resolve_period(period, start_date, end_date)
    query = _scoped_incidents(db, current_user)
    query = _apply_time_range(query, start, end)
    query = _apply_admin_setor(query, current_user, setor)
    query = _apply_common_filters(query, impact_level, school_id, operator_id)
    query = _apply_region_filter(query, region)

    results = query.with_entities(
        Incident.impact_level,
        func.count(Incident.id).label("count")
    ).group_by(Incident.impact_level).all()
    
    return [{"impact": r.impact_level, "count": r.count} for r in results]


@router.get("/incidents-by-operator")
async def get_incidents_by_operator(
    limit: int = 10,
    period: Optional[str] = Query(None, description="day, week, month, year, custom"),
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD (custom)"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD (custom)"),
    setor: Optional[str] = Query(None, description="Filtro de setor para MASTER"),
    impact_level: Optional[str] = Query(None, description="Filtro de impacto"),
    school_id: Optional[int] = Query(None, description="Filtro de escola"),
    operator_id: Optional[int] = Query(None, description="Filtro de operador"),
    region: Optional[str] = Query(None, description="Filtro de regiao/bairro"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter volume de ocorrências por operador."""

    start, end = _resolve_period(period, start_date, end_date)
    base_query = apply_incident_scope(
        db.query(
            User.full_name,
            func.count(Incident.id).label("count")
        ).join(Incident, User.id == Incident.operator_id
        ).filter(Incident.is_archived == False
        ).group_by(User.id, User.full_name
        ).order_by(desc("count")
        ).limit(limit),
        current_user,
        Incident.school_id,
        Incident.setor
    )
    base_query = _apply_time_range(base_query, start, end)
    base_query = _apply_admin_setor(base_query, current_user, setor)
    base_query = _apply_common_filters(base_query, impact_level, school_id, operator_id)
    base_query = _apply_region_filter(base_query, region)
    results = base_query.all()
    
    return [{"operator": r.full_name, "count": r.count} for r in results]


@router.get("/incidents-by-status")
async def get_incidents_by_status(
    period: Optional[str] = Query(None, description="day, week, month, year, custom"),
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD (custom)"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD (custom)"),
    setor: Optional[str] = Query(None, description="Filtro de setor para MASTER"),
    impact_level: Optional[str] = Query(None, description="Filtro de impacto"),
    school_id: Optional[int] = Query(None, description="Filtro de escola"),
    operator_id: Optional[int] = Query(None, description="Filtro de operador"),
    region: Optional[str] = Query(None, description="Filtro de regiao/bairro"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter distribuição de incidentes por status."""

    start, end = _resolve_period(period, start_date, end_date)
    query = _scoped_incidents(db, current_user)
    query = _apply_time_range(query, start, end)
    query = _apply_admin_setor(query, current_user, setor)
    query = _apply_common_filters(query, impact_level, school_id, operator_id)
    query = _apply_region_filter(query, region)

    results = query.with_entities(
        Incident.status,
        func.count(Incident.id).label("count")
    ).group_by(Incident.status).all()
    
    return [{"status": r.status, "count": r.count} for r in results]


@router.get("/incidents-by-location")
async def get_incidents_by_location(
    period: Optional[str] = Query(None, description="day, week, month, year, custom"),
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD (custom)"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD (custom)"),
    setor: Optional[str] = Query(None, description="Filtro de setor para MASTER"),
    impact_level: Optional[str] = Query(None, description="Filtro de impacto"),
    school_id: Optional[int] = Query(None, description="Filtro de escola"),
    operator_id: Optional[int] = Query(None, description="Filtro de operador"),
    region: Optional[str] = Query(None, description="Filtro de regiao/bairro"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter distribuição de incidentes por localização interna."""

    start, end = _resolve_period(period, start_date, end_date)
    query = _scoped_incidents(db, current_user)
    query = _apply_time_range(query, start, end)
    query = _apply_admin_setor(query, current_user, setor)
    query = _apply_common_filters(query, impact_level, school_id, operator_id)
    query = _apply_region_filter(query, region)

    results = query.with_entities(
        Incident.location,
        func.count(Incident.id).label("count")
    ).group_by(Incident.location).all()
    
    return [{"location": r.location, "count": r.count} for r in results]


@router.get("/recent-incidents")
async def get_recent_incidents(
    limit: int = 5,
    period: Optional[str] = Query(None, description="day, week, month, year, custom"),
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD (custom)"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD (custom)"),
    setor: Optional[str] = Query(None, description="Filtro de setor para MASTER"),
    impact_level: Optional[str] = Query(None, description="Filtro de impacto"),
    school_id: Optional[int] = Query(None, description="Filtro de escola"),
    operator_id: Optional[int] = Query(None, description="Filtro de operador"),
    region: Optional[str] = Query(None, description="Filtro de regiao/bairro"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter incidentes mais recentes."""

    start, end = _resolve_period(period, start_date, end_date)
    query = _scoped_incidents(db, current_user)
    query = _apply_time_range(query, start, end)
    query = _apply_admin_setor(query, current_user, setor)
    query = _apply_common_filters(query, impact_level, school_id, operator_id)
    query = _apply_region_filter(query, region)

    incidents = query.order_by(
        Incident.incident_date.desc()
    ).limit(limit).all()
    
    result = []
    for incident in incidents:
        school = db.query(School).filter(School.id == incident.school_id).first()
        operator = db.query(User).filter(User.id == incident.operator_id).first()
        
        result.append({
            "id": incident.id,
            "process_number": incident.process_number,
            "school": school.name if school else "N/A",
            "setor": incident.setor or incident.category,
            "impact_level": incident.impact_level,
            "status": incident.status,
            "operator": operator.full_name if operator else "N/A",
            "created_at": incident.created_at.isoformat(),
            "incident_date": incident.incident_date.isoformat() if incident.incident_date else incident.created_at.isoformat()
        })
    
    return result


@router.get("/monthly-trend")
async def get_monthly_trend(
    months: int = 6,
    period: Optional[str] = Query(None, description="day, week, month, year, custom"),
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD (custom)"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD (custom)"),
    setor: Optional[str] = Query(None, description="Filtro de setor para MASTER"),
    impact_level: Optional[str] = Query(None, description="Filtro de impacto"),
    school_id: Optional[int] = Query(None, description="Filtro de escola"),
    operator_id: Optional[int] = Query(None, description="Filtro de operador"),
    region: Optional[str] = Query(None, description="Filtro de regiao/bairro"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter tendência mensal de incidentes."""
    
    results = []
    today = datetime.now()
    range_start, range_end = _resolve_period(period, start_date, end_date)
    
    for i in range(months - 1, -1, -1):
        # Calcular primeiro e último dia do mês
        month_date = today.replace(day=1) - timedelta(days=i * 30)
        month_start = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        if month_start.month == 12:
            month_end = month_start.replace(year=month_start.year + 1, month=1)
        else:
            month_end = month_start.replace(month=month_start.month + 1)
        
        query = _scoped_incidents(db, current_user)
        query = _apply_time_range(query, month_start, month_end)
        query = _apply_admin_setor(query, current_user, setor)
        query = _apply_common_filters(query, impact_level, school_id, operator_id)
        query = _apply_region_filter(query, region)
        if range_start:
            query = query.filter(Incident.incident_date >= range_start)
        if range_end:
            query = query.filter(Incident.incident_date < range_end)
        count = query.count()
        
        results.append({
            "month": month_start.strftime("%b/%Y"),
            "count": count or 0
        })
    
    return results


@router.get("/incidents-by-region")
async def get_incidents_by_region(
    period: Optional[str] = Query(None, description="day, week, month, year, custom"),
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD (custom)"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD (custom)"),
    setor: Optional[str] = Query(None, description="Filtro de setor para MASTER"),
    impact_level: Optional[str] = Query(None, description="Filtro de impacto"),
    school_id: Optional[int] = Query(None, description="Filtro de escola"),
    operator_id: Optional[int] = Query(None, description="Filtro de operador"),
    region: Optional[str] = Query(None, description="Filtro de regiao/bairro"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter distribuição de incidentes por região/bairro (extraído do endereço da escola)."""
    
    # Buscar todas as escolas com seus incidentes
    schools = db.query(School).all()
    start, end = _resolve_period(period, start_date, end_date)
    
    region_counts = {}
    selected_region = region.strip().lower() if region else None
    for school in schools:
        school_region = extract_region_from_address(school.address)
        if selected_region and school_region.lower() != selected_region:
            continue
        query = _scoped_incidents(db, current_user).filter(
            Incident.school_id == school.id
        )
        query = _apply_time_range(query, start, end)
        query = _apply_admin_setor(query, current_user, setor)
        query = _apply_common_filters(query, impact_level, school_id, operator_id)
        incident_count = query.count() or 0

        if school_region in region_counts:
            region_counts[school_region] += incident_count
        else:
            region_counts[school_region] = incident_count
    
    # Converter para lista e ordenar por quantidade
    results = [{"region": k, "count": v} for k, v in region_counts.items() if v > 0]
    results.sort(key=lambda x: x["count"], reverse=True)
    
    return results


@router.get("/critical-schools")
async def get_critical_schools(
    limit: int = 5,
    days: int = 30,
    period: Optional[str] = Query(None, description="day, week, month, year, custom"),
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD (custom)"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD (custom)"),
    setor: Optional[str] = Query(None, description="Filtro de setor para MASTER"),
    impact_level: Optional[str] = Query(None, description="Filtro de impacto"),
    school_id: Optional[int] = Query(None, description="Filtro de escola"),
    operator_id: Optional[int] = Query(None, description="Filtro de operador"),
    region: Optional[str] = Query(None, description="Filtro de regiao/bairro"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter escolas com mais ocorrências no período especificado."""
    
    start, end = _resolve_period(period, start_date, end_date)
    if not period:
        start = datetime.now() - timedelta(days=days)
        end = None
    
    base_query = apply_incident_scope(
        db.query(
            School.id,
            School.name,
            School.address,
            func.count(Incident.id).label("count")
        ).join(Incident, School.id == Incident.school_id
        ).filter(Incident.is_archived == False
        ).group_by(School.id, School.name, School.address
        ).order_by(desc("count")),
        current_user,
        Incident.school_id,
        Incident.setor
    )
    base_query = _apply_time_range(base_query, start, end)
    base_query = _apply_admin_setor(base_query, current_user, setor)
    base_query = _apply_common_filters(base_query, impact_level, school_id, operator_id)
    base_query = _apply_region_filter(base_query, region, school_joined=True)
    results = base_query.limit(limit).all()
    
    return [{
        "id": r.id,
        "name": r.name,
        "region": extract_region_from_address(r.address),
        "count": r.count
    } for r in results]


@router.get("/filtered-stats")
async def get_filtered_stats(
    start_date: Optional[str] = Query(None, description="Data inicial (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Data final (YYYY-MM-DD)"),
    setor: Optional[str] = Query(None, description="Filtro de setor para MASTER"),
    impact_level: Optional[str] = Query(None, description="Filtro de impacto"),
    school_id: Optional[int] = Query(None, description="Filtro de escola"),
    operator_id: Optional[int] = Query(None, description="Filtro de operador"),
    region: Optional[str] = Query(None, description="Filtro de regiao/bairro"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter estatísticas filtradas por período."""
    
    query = apply_incident_scope(
        db.query(func.count(Incident.id)),
        current_user,
        Incident.school_id,
        Incident.setor
    )
    query = query.filter(Incident.is_archived == False)
    
    start = datetime.strptime(start_date, "%Y-%m-%d") if start_date else None
    end = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1) if end_date else None
    query = _apply_time_range(query, start, end)
    query = _apply_admin_setor(query, current_user, setor)
    query = _apply_common_filters(query, impact_level, school_id, operator_id)
    query = _apply_region_filter(query, region)
    
    total = query.scalar() or 0
    
    # Por categoria no período
    category_query = apply_incident_scope(
        db.query(
            func.coalesce(Incident.setor, Incident.category).label("setor"),
            func.count(Incident.id).label("count")
        ),
        current_user,
        Incident.school_id,
        Incident.setor
    )
    category_query = category_query.filter(Incident.is_archived == False)
    category_query = _apply_time_range(category_query, start, end)
    category_query = _apply_admin_setor(category_query, current_user, setor)
    category_query = _apply_common_filters(category_query, impact_level, school_id, operator_id)
    category_query = _apply_region_filter(category_query, region)
    
    categories = category_query.group_by(func.coalesce(Incident.setor, Incident.category)).all()
    
    # Por impacto no período
    impact_query = apply_incident_scope(
        db.query(
            Incident.impact_level,
            func.count(Incident.id).label("count")
        ),
        current_user,
        Incident.school_id,
        Incident.setor
    )
    impact_query = impact_query.filter(Incident.is_archived == False)
    impact_query = _apply_time_range(impact_query, start, end)
    impact_query = _apply_admin_setor(impact_query, current_user, setor)
    impact_query = _apply_common_filters(impact_query, impact_level, school_id, operator_id)
    impact_query = _apply_region_filter(impact_query, region)
    
    impacts = impact_query.group_by(Incident.impact_level).all()
    
    return {
        "total": total,
        "by_category": [{"setor": c.setor, "count": c.count} for c in categories],
        "by_impact": [{"impact": i.impact_level, "count": i.count} for i in impacts]
    }
