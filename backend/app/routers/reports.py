from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_
from typing import Optional
from datetime import datetime, timedelta
from weasyprint import HTML
from jinja2 import Template
import re

from app.database import get_db
from app.models.incident import Incident
from app.models.school import School
from app.models.user import User, UserRole
from app.models.report import ReportTemplate
from app.models.config import ActivityLog
from app.schemas.report import ReportTemplateUpdate, ReportTemplateResponse
from app.utils.auth import get_current_user, get_current_admin_user, get_current_report_editor
from app.utils.request_context import get_request_id, get_session_jti
from app.utils.rbac import apply_incident_scope
from app.config import settings

router = APIRouter(prefix="/api/reports", tags=["Relatórios"])


def _log_report_event(
    db: Session,
    user_id: int,
    action: str,
    description: str,
    request: Request | None = None,
):
    db.add(ActivityLog(
        user_id=user_id,
        action=action,
        entity_type="report",
        entity_id=None,
        description=description,
        ip_address=request.client.host if request and request.client else None,
        request_id=(request.state.request_id if request and hasattr(request.state, "request_id") else get_request_id()),
        session_jti=(request.state.session_jti if request and hasattr(request.state, "session_jti") else get_session_jti()),
    ))
    db.commit()


def extract_region_from_address(address: str) -> str:
    """Extrai o bairro/região do endereço."""
    if not address:
        return "Não informado"

    match = re.search(r" - ([^,]+)", address)
    if match:
        return match.group(1).strip()

    parts = [part.strip() for part in address.split(",") if part.strip()]
    if len(parts) >= 2:
        return parts[-2]
    
    return "Não informado"


def _resolve_period(period: Optional[str], start_date: Optional[str], end_date: Optional[str]):
    if not period:
        return None, None

    now = datetime.now()
    period = period.lower()

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


REPORT_TEMPLATE = """
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <style>
        @page {
            size: A4;
            margin: 2cm;
            @bottom-center {
                content: "Pagina " counter(page) " de " counter(pages);
                font-size: 9pt;
                color: #888;
            }
        }
        
        body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #1a1a1a;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #0066cc;
            padding-bottom: 20px;
        }
        
        .header h1 {
            font-size: 16pt;
            color: #0066cc;
            margin: 0 0 5px 0;
        }
        
        .header h2 {
            font-size: 14pt;
            color: #333;
            margin: 0 0 5px 0;
            font-weight: normal;
        }
        
        .header p {
            font-size: 10pt;
            color: #666;
            margin: 0;
        }

        .subtitle {
            font-size: 10pt;
            color: #004b8d;
            margin-top: 6px;
            font-weight: 600;
        }

        .context {
            margin-top: 6px;
            font-size: 9pt;
            color: #555;
        }

        .filters {
            margin-top: 6px;
            font-size: 9pt;
            color: #555;
        }
        
        .section {
            margin-bottom: 25px;
        }
        
        .section-title {
            font-size: 13pt;
            font-weight: bold;
            color: #0066cc;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
            margin-bottom: 15px;
        }
        
        .stats-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .stat-card {
            flex: 1;
            min-width: 120px;
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }

        .stat-card.high-impact {
            background: #fee2e2;
            border: 1px solid #fecaca;
        }

        .stat-card.high-impact .stat-value {
            color: #b91c1c;
        }
        
        .stat-value {
            font-size: 24pt;
            font-weight: bold;
            color: #0066cc;
        }
        
        .stat-label {
            font-size: 9pt;
            color: #666;
            text-transform: uppercase;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        
        th {
            background: #f0f4f8;
            color: #333;
            font-weight: 600;
            text-align: left;
            padding: 10px;
            font-size: 10pt;
            border-bottom: 2px solid #0066cc;
        }
        
        td {
            padding: 10px 10px;
            border-bottom: 1px solid #eee;
            font-size: 10pt;
            line-height: 1.5;
        }

        th.num,
        td.num {
            text-align: right;
        }
        
        tr:nth-child(even) {
            background: #f9f9f9;
        }
        
        .impact-alto {
            color: #dc2626;
            font-weight: bold;
        }
        
        .impact-medio {
            color: #d97706;
        }
        
        .impact-baixo {
            color: #16a34a;
        }
        
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 9pt;
            color: #888;
            border-top: 1px solid #ddd;
            padding-top: 15px;
        }
        
        .chart-placeholder {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 15px;
        }
        
        .bar-container {
            margin-bottom: 8px;
        }
        
        .bar-label {
            display: inline-block;
            width: 170px;
            font-size: 10pt;
        }
        
        .bar-wrapper {
            display: inline-block;
            width: calc(100% - 220px);
            height: 22px;
            background: #e5e7eb;
            border-radius: 4px;
            vertical-align: middle;
        }
        
        .bar-fill {
            height: 100%;
            background: #0066cc;
            border-radius: 4px;
        }
        
        .bar-value {
            display: inline-block;
            width: 40px;
            text-align: right;
            font-size: 10pt;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ organization_name|upper }}</h1>
        <h2>{{ department_name }}</h2>
        <p>Relatório Consolidado de Ocorrências</p>
        <p class="subtitle">Periodo: {{ periodo }}</p>
        <p class="context">Relatório gerado com filtros aplicados no dashboard.</p>
        {% if filtros_aplicados %}
        <div class="filters">Filtros: {{ filtros_aplicados }}</div>
        {% endif %}
    </div>
    
    <div class="section">
        <div class="section-title">Resumo Geral</div>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">{{ total_incidents }}</div>
                <div class="stat-label">Total de Ocorrências</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{{ total_schools }}</div>
                <div class="stat-label">Escolas Atendidas</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{{ total_regions }}</div>
                <div class="stat-label">Regiões Afetadas</div>
            </div>
            <div class="stat-card high-impact">
                <div class="stat-value">{{ high_impact }}</div>
                <div class="stat-label">Alto Impacto</div>
            </div>
        </div>
    </div>
    
    <div class="section">
        <div class="section-title">Ocorrências por Setor</div>
        <div class="chart-placeholder">
            {% for item in by_setor %}
            <div class="bar-container">
                <span class="bar-label">{{ item.setor }}</span>
                <span class="bar-wrapper">
                    <span class="bar-fill" style="width: {{ (item.count / max_setor * 100) if max_setor > 0 else 0 }}%;"></span>
                </span>
                <span class="bar-value">{{ item.count }}</span>
            </div>
            {% endfor %}
        </div>
    </div>
    
    <div class="section">
        <div class="section-title">Ocorrências por Região</div>
        <div class="chart-placeholder">
            {% for item in by_region %}
            <div class="bar-container">
                <span class="bar-label">{{ item.region }}</span>
                <span class="bar-wrapper">
                    <span class="bar-fill" style="width: {{ (item.count / max_region * 100) if max_region > 0 else 0 }}%; background: #10b981;"></span>
                </span>
                <span class="bar-value">{{ item.count }}</span>
            </div>
            {% endfor %}
        </div>
    </div>
    
    <div class="section">
        <div class="section-title">Escolas com Mais Ocorrências</div>
        <table>
            <thead>
                <tr>
                    <th style="width: 5%;">#</th>
                    <th style="width: 45%;">Escola</th>
                    <th style="width: 30%;">Região</th>
                    <th class="num" style="width: 20%;">Qtd.</th>
                </tr>
            </thead>
            <tbody>
                {% for school in top_schools %}
                <tr>
                    <td>{{ loop.index }}</td>
                    <td>{{ school.name }}</td>
                    <td>{{ school.region }}</td>
                    <td class="num" style="font-weight: bold;">{{ school.count }}</td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
    </div>
    
    <div class="section">
        <div class="section-title">Ocorrências por Nível de Impacto</div>
        <table>
            <thead>
                <tr>
                    <th>Nível de Impacto</th>
                    <th class="num">Quantidade</th>
                    <th class="num">Percentual</th>
                </tr>
            </thead>
            <tbody>
                {% for item in by_impact %}
                <tr>
                    <td class="impact-{{ item.impact|lower }}">{{ item.impact }}</td>
                    <td class="num">{{ item.count }}</td>
                    <td class="num">{{ "%.1f"|format(item.percent) }}%</td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
    </div>
    
    <div class="footer">
        <p>Relatório gerado automaticamente pelo {{ app_name }} - {{ generated_at }}</p>
        <p>{{ organization_name }}</p>
    </div>
</body>
</html>
"""


@router.get("/oficio-text", response_model=ReportTemplateResponse)
async def get_oficio_text(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_report_editor)
):
    """Obter o texto do ofício configurável."""
    template = db.query(ReportTemplate).first()
    if not template:
        template = ReportTemplate(texto_oficio="", updated_by=current_admin.id)
        db.add(template)
        db.commit()
        db.refresh(template)
    return template


@router.put("/oficio-text", response_model=ReportTemplateResponse)
async def update_oficio_text(
    data: ReportTemplateUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_report_editor)
):
    """Atualizar o texto do ofício configurável."""
    template = db.query(ReportTemplate).first()
    if not template:
        template = ReportTemplate(texto_oficio=data.texto_oficio, updated_by=current_admin.id)
        db.add(template)
    else:
        template.texto_oficio = data.texto_oficio
        template.updated_by = current_admin.id

    db.commit()
    db.refresh(template)
    _log_report_event(db, current_admin.id, "UPDATE", "Atualizou texto de ofício", request)
    return template


@router.get("/monthly")
async def generate_monthly_report(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2020, le=2100),
    period: Optional[str] = Query(None, description="day, week, month, year, custom"),
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD (custom)"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD (custom)"),
    setor: Optional[str] = Query(None, description="Filtro de setor para MASTER"),
    impact_level: Optional[str] = Query(None, description="Filtro de impacto"),
    school_id: Optional[int] = Query(None, description="Filtro de escola"),
    operator_id: Optional[int] = Query(None, description="Filtro de operador"),
    region: Optional[str] = Query(None, description="Filtro de regiao/bairro"),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Gerar relatório mensal consolidado em PDF."""
    
    # Usar mês e ano atual se não especificados
    now = datetime.now()
    target_month = month or now.month
    target_year = year or now.year

    start, end = _resolve_period(period, start_date, end_date)
    if not period:
        start = datetime(target_year, target_month, 1)
        if target_month == 12:
            end = datetime(target_year + 1, 1, 1)
        else:
            end = datetime(target_year, target_month + 1, 1)

    query = apply_incident_scope(
        db.query(Incident),
        current_user,
        Incident.school_id,
        Incident.setor
    )
    if start:
        query = query.filter(Incident.created_at >= start)
    if end:
        query = query.filter(Incident.created_at < end)

    query = _apply_admin_setor(query, current_user, setor)
    query = _apply_common_filters(query, impact_level, school_id, operator_id)
    query = _apply_region_filter(query, region)
    incidents = query.all()
    
    total_incidents = len(incidents)
    
    # Contar por escola e região
    school_counts = {}
    region_counts = {}
    setor_counts = {}
    impact_counts = {"Alto": 0, "Médio": 0, "Baixo": 0}
    
    school_map = {
        school.id: school
        for school in db.query(School).filter(School.id.in_({i.school_id for i in incidents})).all()
    }
    for incident in incidents:
        school = school_map.get(incident.school_id)
        if school:
            region = extract_region_from_address(school.address)
            
            # Por escola
            if school.id not in school_counts:
                school_counts[school.id] = {
                    "name": school.name,
                    "region": region,
                    "count": 0
                }
            school_counts[school.id]["count"] += 1
            
            # Por região
            if region not in region_counts:
                region_counts[region] = 0
            region_counts[region] += 1
        
        # Por setor
        setor_value = incident.setor or incident.category
        if setor_value not in setor_counts:
            setor_counts[setor_value] = 0
        setor_counts[setor_value] += 1
        
        # Por impacto
        if incident.impact_level in impact_counts:
            impact_counts[incident.impact_level] += 1
    
    # Preparar dados para o template
    by_setor = sorted(
        [{"setor": k, "count": v} for k, v in setor_counts.items()],
        key=lambda x: x["count"],
        reverse=True
    )
    max_setor = max([s["count"] for s in by_setor]) if by_setor else 0
    
    by_region = sorted(
        [{"region": k, "count": v} for k, v in region_counts.items()],
        key=lambda x: x["count"],
        reverse=True
    )
    max_region = max([r["count"] for r in by_region]) if by_region else 0
    
    top_schools = sorted(
        list(school_counts.values()),
        key=lambda x: x["count"],
        reverse=True
    )[:10]
    
    total_for_percent = sum(impact_counts.values()) or 1
    by_impact = [
        {
            "impact": k,
            "count": v,
            "percent": (v / total_for_percent) * 100
        }
        for k, v in impact_counts.items()
        if v > 0
    ]
    
    # Nomes dos meses em português
    month_names = {
        1: "Janeiro", 2: "Fevereiro", 3: "Março", 4: "Abril",
        5: "Maio", 6: "Junho", 7: "Julho", 8: "Agosto",
        9: "Setembro", 10: "Outubro", 11: "Novembro", 12: "Dezembro"
    }
    
    # Renderizar template
    template = Template(REPORT_TEMPLATE)
    if period:
        if period == "custom" and (start_date or end_date):
            periodo_label = f"{start_date or '...'} a {end_date or '...'}"
        else:
            period_labels = {
                "day": "Dia atual",
                "week": "Semana atual",
                "month": "Mes atual",
                "year": "Ano atual",
                "custom": "Periodo personalizado"
            }
            periodo_label = period_labels.get(period.lower(), "Periodo selecionado")
    else:
        periodo_label = f"{month_names[target_month]} de {target_year}"

    filtros = []
    if impact_level:
        filtros.append(f"Impacto: {impact_level}")
    if region:
        filtros.append(f"Regiao: {region}")
    if current_user.role == UserRole.MASTER and setor:
        filtros.append(f"Setor: {setor}")
    if school_id:
        school = db.query(School).filter(School.id == school_id).first()
        filtros.append(f"Escola: {school.name if school else school_id}")
    if operator_id:
        operator = db.query(User).filter(User.id == operator_id).first()
        filtros.append(f"Operador: {operator.full_name if operator else operator_id}")
    filtros_aplicados = " | ".join(filtros)

    html_content = template.render(
        periodo=periodo_label,
        filtros_aplicados=filtros_aplicados,
        app_name=settings.APP_NAME,
        organization_name=settings.ORGANIZATION_NAME,
        department_name=settings.DEPARTMENT_NAME,
        total_incidents=total_incidents,
        total_schools=len(school_counts),
        total_regions=len(region_counts),
        high_impact=impact_counts.get("Alto", 0),
        by_setor=by_setor,
        max_setor=max_setor,
        by_region=by_region,
        max_region=max_region,
        top_schools=top_schools,
        by_impact=by_impact,
        generated_at=now.strftime("%d/%m/%Y às %H:%M")
    )
    
    # Gerar PDF
    html_doc = HTML(string=html_content)
    pdf_bytes = html_doc.write_pdf()

    _log_report_event(
        db,
        current_user.id,
        "GENERATE",
        f"Gerou relatório mensal em PDF (period={period or 'month'}, year={target_year}, month={target_month})",
        request,
    )
    
    if period:
        filename = f"{settings.REPORT_FILENAME_PREFIX}_{now.strftime('%Y%m%d_%H%M')}.pdf"
    else:
        filename = f"{settings.REPORT_FILENAME_PREFIX}_{target_month:02d}_{target_year}.pdf"
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )
