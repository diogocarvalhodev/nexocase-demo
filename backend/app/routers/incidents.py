from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from datetime import datetime
import os
import re

from app.database import get_db, SessionLocal
from app.models.incident import Incident, StatusEnum
from app.models.school import School
from app.models.user import User, UserRole
from app.models.report import ReportTemplate
from app.schemas.incident import (
    IncidentCreate,
    IncidentResponse,
    IncidentUpdate,
    IncidentPdfEdit,
    IncidentValidationNoteRequest,
)
from app.utils.auth import get_current_user
from app.utils.rbac import apply_incident_scope, can_access_incident
from app.services.pdf_generator import generate_incident_pdf, generate_incident_pdf_bytes, generate_process_number
from app.services.email_service import (
    send_incident_notification,
    send_incident_validation_notification,
)
from app.config import settings

router = APIRouter(prefix="/api/incidents", tags=["Ocorrências"])

# E-mails para notificacao automatica (configuravel via .env)
NOTIFICATION_EMAILS = settings.notification_emails_list


def _run_coroutine(coro):
    import asyncio

    try:
        asyncio.run(coro)
    except RuntimeError:
        loop = asyncio.new_event_loop()
        try:
            asyncio.set_event_loop(loop)
            loop.run_until_complete(coro)
        finally:
            loop.close()


def _post_approval_tasks(incident_id: int):
    db = SessionLocal()
    try:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            return

        school = db.query(School).filter(School.id == incident.school_id).first()
        operator = db.query(User).filter(User.id == incident.operator_id).first()
        if not operator:
            operator = db.query(User).filter(User.id == incident.validated_by).first()

        if school:
            try:
                report_template = db.query(ReportTemplate).first()
                texto_oficio = report_template.texto_oficio if report_template else None
                pdf_path = generate_incident_pdf(incident, school, operator, texto_oficio=texto_oficio)
                incident.pdf_path = pdf_path
                db.commit()

                _run_coroutine(
                    send_incident_notification(
                        incident_data={
                            "process_number": incident.process_number,
                            "location": incident.location,
                            "category": incident.category,
                            "setor": incident.setor or incident.category,
                            "impact_level": incident.impact_level,
                            "description": incident.description,
                            "actions_taken": incident.actions_taken,
                            "created_at": incident.created_at.strftime("%d/%m/%Y %H:%M")
                        },
                        school_name=school.name,
                        operator_name=operator.full_name if operator else "Operador",
                        pdf_path=pdf_path,
                        recipient_emails=NOTIFICATION_EMAILS
                    )
                )

                if operator and operator.email:
                    _run_coroutine(
                        send_incident_validation_notification(
                            recipient_emails=[operator.email],
                            incident_data={
                                "process_number": incident.process_number,
                                "school_name": school.name,
                                "setor": incident.setor or incident.category,
                            },
                            approved=True,
                            note=incident.validation_note
                        )
                    )

            except Exception as exc:
                print(f"Erro ao gerar PDF/notificar: {str(exc)}")

    finally:
        db.close()


def _post_rejection_tasks(incident_id: int):
    db = SessionLocal()
    try:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            return

        school = db.query(School).filter(School.id == incident.school_id).first()
        operator = db.query(User).filter(User.id == incident.operator_id).first()

        if operator and operator.email and school:
            _run_coroutine(
                send_incident_validation_notification(
                    recipient_emails=[operator.email],
                    incident_data={
                        "process_number": incident.process_number,
                        "school_name": school.name,
                        "setor": incident.setor or incident.category,
                    },
                    approved=False,
                    note=incident.validation_note
                )
            )
    finally:
        db.close()


def get_next_process_number(db: Session) -> str:
    """Gerar próximo número de processo usando o maior sufixo já persistido."""
    current_year = datetime.now().year
    prefix = f"{settings.PROCESS_NUMBER_PREFIX}/{current_year}/"
    pattern = re.compile(rf"^{re.escape(prefix)}(?P<sequence>\d+)$")
    max_sequence = 0

    existing_numbers = db.query(Incident.process_number).filter(Incident.process_number.like(f"{prefix}%")).all()
    for (process_number,) in existing_numbers:
        if not process_number:
            continue
        match = pattern.match(process_number)
        if not match:
            continue
        max_sequence = max(max_sequence, int(match.group("sequence")))

    return generate_process_number(current_year, max_sequence + 1)


def _requires_validation(user: User) -> bool:
    return user.role in {UserRole.DIRETOR, UserRole.GESTOR_SETOR}


def _ensure_operator(user: User):
    if user.role != UserRole.OPERADOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas operadores podem validar ocorrencias"
        )


@router.post("", response_model=IncidentResponse, include_in_schema=False)
@router.post("/", response_model=IncidentResponse)
async def create_incident(
    incident_data: IncidentCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Criar nova ocorrência e gerar PDF automaticamente."""
    
    effective_school_id = incident_data.school_id
    if current_user.role == UserRole.DIRETOR:
        if not current_user.escola_vinculada:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Usuário diretor sem escola vinculada"
            )
        effective_school_id = current_user.escola_vinculada

    if current_user.role == UserRole.GESTOR_SETOR and not current_user.setor_vinculado:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuário gestor de setor sem setor vinculado"
        )

    # Verificar se a escola existe
    school = db.query(School).filter(School.id == effective_school_id).first()
    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Escola não encontrada"
        )
    
    # Criar incidente
    incident_payload = incident_data.model_dump()
    setor_value = incident_payload.get("setor") or incident_payload.get("category")

    if not setor_value and current_user.role != UserRole.GESTOR_SETOR:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Setor é obrigatório"
        )
    incident_payload["school_id"] = effective_school_id
    incident_payload["unidade_escolar"] = school.name

    if current_user.role == UserRole.GESTOR_SETOR:
        incident_payload["setor"] = current_user.setor_vinculado
        setor_value = current_user.setor_vinculado

    if setor_value:
        incident_payload["setor"] = setor_value
        incident_payload["category"] = setor_value

    initial_status = (
        StatusEnum.AGUARDANDO_VALIDACAO.value
        if _requires_validation(current_user)
        else StatusEnum.FECHADO.value
    )

    new_incident = None
    process_number = None
    for _ in range(3):
        process_number = get_next_process_number(db)
        new_incident = Incident(
            process_number=process_number,
            operator_id=current_user.id,
            status=initial_status,
            **incident_payload
        )

        db.add(new_incident)
        try:
            db.commit()
            db.refresh(new_incident)
            break
        except IntegrityError:
            db.rollback()
            new_incident = None
            continue

    if new_incident is None or process_number is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Não foi possível gerar um número de processo único. Tente novamente."
        )
    
    # Gerar PDF apenas quando nao exige validacao
    if initial_status != StatusEnum.AGUARDANDO_VALIDACAO.value:
        try:
            report_template = db.query(ReportTemplate).first()
            texto_oficio = report_template.texto_oficio if report_template else None
            pdf_path = generate_incident_pdf(new_incident, school, current_user, texto_oficio=texto_oficio)
            new_incident.pdf_path = pdf_path
            db.commit()
            db.refresh(new_incident)

            # Enviar notificação por e-mail em background
            background_tasks.add_task(
                send_incident_notification,
                incident_data={
                    "process_number": process_number,
                    "location": new_incident.location,
                    "category": new_incident.category,
                    "setor": new_incident.setor or new_incident.category,
                    "impact_level": new_incident.impact_level,
                    "description": new_incident.description,
                    "actions_taken": new_incident.actions_taken,
                    "created_at": new_incident.created_at.strftime("%d/%m/%Y %H:%M")
                },
                school_name=school.name,
                operator_name=current_user.full_name,
                pdf_path=pdf_path,
                recipient_emails=NOTIFICATION_EMAILS
            )

        except Exception as e:
            print(f"Erro ao gerar PDF: {str(e)}")
    
    # Carregar relacionamentos para resposta
    new_incident.school = school
    new_incident.operator = current_user
    
    return new_incident


@router.get("", response_model=List[IncidentResponse], include_in_schema=False)
@router.get("/", response_model=List[IncidentResponse])
async def list_incidents(
    skip: int = 0,
    limit: int = 100,
    archived: Optional[bool] = False,
    status_filter: Optional[str] = None,
    category: Optional[str] = None,
    setor: Optional[str] = None,
    impact_level: Optional[str] = None,
    school_id: Optional[int] = None,
    operator_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Listar ocorrências com filtros."""
    query = db.query(Incident)

    if archived is not None:
        query = query.filter(Incident.is_archived == archived)
    
    if status_filter:
        normalized_status = status_filter.strip().lower()
        if normalized_status in {"pendente de validacao", "pendente de validação"}:
            status_filter = "Aguardando Validação"
        query = query.filter(Incident.status == status_filter)
    
    if setor:
        query = query.filter(or_(Incident.setor == setor, Incident.category == setor))
    elif category:
        query = query.filter(Incident.category == category)

    if impact_level:
        query = query.filter(Incident.impact_level == impact_level)
    
    if school_id:
        query = query.filter(Incident.school_id == school_id)

    if operator_id:
        query = query.filter(Incident.operator_id == operator_id)

    if q:
        query = query.join(School, School.id == Incident.school_id, isouter=True)
        like_value = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Incident.process_number.ilike(like_value),
                Incident.description.ilike(like_value),
                Incident.actions_taken.ilike(like_value),
                School.name.ilike(like_value)
            )
        )
    
    if start_date:
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(Incident.incident_date >= start)
        except ValueError:
            pass
    
    if end_date:
        try:
            from datetime import timedelta
            end = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            query = query.filter(Incident.incident_date < end)
        except ValueError:
            pass
    
    query = apply_incident_scope(query, current_user, Incident.school_id, Incident.setor)
    incidents = query.order_by(Incident.incident_date.desc()).offset(skip).limit(limit).all()
    
    return incidents


@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter detalhes de uma ocorrência."""
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ocorrência não encontrada"
        )

    if not can_access_incident(current_user, incident):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ocorrência não encontrada"
        )

    return incident


@router.put("/{incident_id}", response_model=IncidentResponse)
async def update_incident(
    incident_id: int,
    incident_data: IncidentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualizar ocorrência."""
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ocorrência não encontrada"
        )

    if not can_access_incident(current_user, incident):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ocorrência não encontrada"
        )
    
    # Atualizar campos
    update_data = incident_data.model_dump(exclude_unset=True)
    setor_value = update_data.get("setor") or update_data.get("category")

    if current_user.role == UserRole.DIRETOR:
        update_data.pop("setor", None)
        update_data.pop("unidade_escolar", None)
    elif current_user.role == UserRole.GESTOR_SETOR:
        update_data["setor"] = current_user.setor_vinculado
        setor_value = current_user.setor_vinculado

    if setor_value:
        update_data["setor"] = setor_value
        update_data["category"] = setor_value
    
    # Se status mudou para Fechado, registrar data
    if update_data.get("status") == StatusEnum.FECHADO.value and incident.status != StatusEnum.FECHADO.value:
        incident.resolved_at = datetime.utcnow()
    
    for key, value in update_data.items():
        setattr(incident, key, value)
    
    db.commit()
    db.refresh(incident)
    
    return incident


@router.post("/{incident_id}/approve", response_model=IncidentResponse)
async def approve_incident(
    incident_id: int,
    payload: IncidentValidationNoteRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Aprovar ocorrencia aguardando validacao (apenas operadores)."""
    _ensure_operator(current_user)

    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ocorrencia nao encontrada"
        )

    if incident.status != StatusEnum.AGUARDANDO_VALIDACAO.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ocorrencia nao esta aguardando validacao"
        )

    incident.status = StatusEnum.APROVADA.value
    incident.validated_by = current_user.id
    incident.validated_at = datetime.utcnow()
    incident.rejection_reason = None
    note_value = (payload.note or "").strip()
    incident.validation_note = note_value or None
    db.commit()
    db.refresh(incident)

    background_tasks.add_task(_post_approval_tasks, incident.id)

    return incident


@router.post("/{incident_id}/reject", response_model=IncidentResponse)
async def reject_incident(
    incident_id: int,
    payload: IncidentValidationNoteRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Rejeitar ocorrencia aguardando validacao (apenas operadores)."""
    _ensure_operator(current_user)

    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ocorrencia nao encontrada"
        )

    if incident.status != StatusEnum.AGUARDANDO_VALIDACAO.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ocorrencia nao esta aguardando validacao"
        )

    incident.status = StatusEnum.REJEITADA.value
    incident.validated_by = current_user.id
    incident.validated_at = datetime.utcnow()
    note_value = (payload.note or "").strip() or None
    incident.rejection_reason = note_value
    incident.validation_note = note_value
    incident.pdf_path = None
    db.commit()
    db.refresh(incident)

    background_tasks.add_task(_post_rejection_tasks, incident.id)

    return incident


@router.get("/{incident_id}/pdf")
async def download_pdf(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Baixar PDF da ocorrência."""
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ocorrência não encontrada"
        )

    if not can_access_incident(current_user, incident):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ocorrência não encontrada"
        )
    
    if not incident.pdf_path or not os.path.exists(incident.pdf_path):
        # Regenerar PDF se não existir
        school = db.query(School).filter(School.id == incident.school_id).first()
        operator = db.query(User).filter(User.id == incident.operator_id).first()
        
        try:
            report_template = db.query(ReportTemplate).first()
            texto_oficio = report_template.texto_oficio if report_template else None
            pdf_path = generate_incident_pdf(incident, school, operator, texto_oficio=texto_oficio)
            incident.pdf_path = pdf_path
            db.commit()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro ao gerar PDF: {str(e)}"
            )
    
    filename = f"documento_{incident.process_number.replace('/', '_')}.pdf"
    
    return FileResponse(
        incident.pdf_path,
        media_type="application/pdf",
        filename=filename
    )


@router.post("/{incident_id}/regenerate-pdf", response_model=IncidentResponse)
async def regenerate_pdf(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Regenerar PDF da ocorrência."""
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ocorrência não encontrada"
        )

    if not can_access_incident(current_user, incident):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ocorrência não encontrada"
        )
    
    school = db.query(School).filter(School.id == incident.school_id).first()
    operator = db.query(User).filter(User.id == incident.operator_id).first()
    
    try:
        report_template = db.query(ReportTemplate).first()
        texto_oficio = report_template.texto_oficio if report_template else None
        pdf_path = generate_incident_pdf(incident, school, operator, texto_oficio=texto_oficio)
        incident.pdf_path = pdf_path
        db.commit()
        db.refresh(incident)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao regenerar PDF: {str(e)}"
        )
    
    return incident


@router.post("/{incident_id}/pdf-edit")
async def generate_custom_pdf(
    incident_id: int,
    payload: IncidentPdfEdit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Gerar PDF avulso com campos editados (não altera a ocorrência)."""
    if current_user.role not in {UserRole.MASTER, UserRole.CHEFIA}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado"
        )

    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ocorrência não encontrada"
        )

    if not can_access_incident(current_user, incident):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ocorrência não encontrada"
        )

    school = db.query(School).filter(School.id == incident.school_id).first()
    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Escola não encontrada"
        )

    operator = db.query(User).filter(User.id == incident.operator_id).first() or current_user

    report_template = db.query(ReportTemplate).first()
    texto_oficio = report_template.texto_oficio if report_template else None

    overrides = payload.model_dump(exclude_unset=True)
    if "incident_date" in overrides and overrides["incident_date"]:
        try:
            overrides["incident_date"] = datetime.strptime(overrides["incident_date"], "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Data do registro inválida"
            )

    pdf_bytes = generate_incident_pdf_bytes(
        incident,
        school,
        operator,
        texto_oficio=texto_oficio,
        overrides=overrides
    )

    process_number = overrides.get("process_number") or incident.process_number
    filename = f"oficio_{process_number.replace('/', '_')}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
