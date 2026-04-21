from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.config import Category, ImpactLevel, Location, SystemConfig
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.tenant import (
    ApplyPresetRequest,
    CompleteOnboardingRequest,
    OnboardingStatusResponse,
    TenantProfileResponse,
    TenantUIConfigResponse,
    TenantUIConfigUpdate,
)
from app.utils.auth import get_current_admin_user, get_current_user

router = APIRouter(prefix="/api/tenant", tags=["Tenant"])

TENANT_CONFIG_DESCRIPTIONS = {
    "ui.app_name": "Nome principal da aplicacao para o tenant",
    "ui.subtitle": "Subtitulo da aplicacao para o tenant",
    "ui.primary_color": "Cor primaria da interface",
    "ui.accent_color": "Cor de destaque da interface",
}

DEFAULT_UI_CONFIG = {
    "app_name": "NexoCase",
    "subtitle": "Gestão de Ocorrências",
    "primary_color": "#0f766e",
    "accent_color": "#f59e0b",
}

PRESET_DEFINITIONS = {
    "education": {
        "categories": [
            ("Pedagógico", "Ocorrências ligadas ao processo pedagógico"),
            ("Segurança", "Ocorrências de segurança na unidade"),
            ("Infraestrutura", "Ocorrências de manutenção e estrutura"),
            ("Convivência", "Conflitos e temas de convivência escolar"),
        ],
        "locations": [
            ("Sala de Aula", ""),
            ("Pátio", ""),
            ("Secretaria", ""),
            ("Refeitório", ""),
        ],
        "impact_levels": [
            ("Baixo", "Impacto localizado", "#22c55e", 1),
            ("Médio", "Requer acompanhamento", "#f59e0b", 2),
            ("Alto", "Impacto significativo", "#ef4444", 3),
            ("Crítico", "Risco grave ou recorrente", "#7f1d1d", 4),
        ],
    },
    "condominium": {
        "categories": [
            ("Portaria", "Controle de acesso e portaria"),
            ("Manutenção", "Infraestrutura e manutenção predial"),
            ("Convivência", "Regras internas e convivência"),
            ("Segurança", "Ocorrências de segurança"),
        ],
        "locations": [
            ("Portaria", ""),
            ("Garagem", ""),
            ("Área Comum", ""),
            ("Bloco/Apartamento", ""),
        ],
        "impact_levels": [
            ("Baixo", "Impacto pontual", "#22c55e", 1),
            ("Médio", "Impacto moderado", "#f59e0b", 2),
            ("Alto", "Impacto alto para condôminos", "#ef4444", 3),
            ("Crítico", "Risco imediato", "#7f1d1d", 4),
        ],
    },
    "shopping": {
        "categories": [
            ("Operação", "Funcionamento da operação diária"),
            ("Segurança", "Ocorrências de segurança patrimonial"),
            ("Atendimento", "Experiência do cliente"),
            ("Infraestrutura", "Falhas estruturais e manutenção"),
        ],
        "locations": [
            ("Praça de Alimentação", ""),
            ("Corredor", ""),
            ("Estacionamento", ""),
            ("Loja", ""),
        ],
        "impact_levels": [
            ("Baixo", "Sem impacto operacional", "#22c55e", 1),
            ("Médio", "Impacto controlado", "#f59e0b", 2),
            ("Alto", "Impacto alto ao público", "#ef4444", 3),
            ("Crítico", "Risco crítico ao negócio", "#7f1d1d", 4),
        ],
    },
}


def _tenant_scoped_key(tenant_id: int, key: str) -> str:
    return f"tenant:{tenant_id}:{key}"


def _get_current_tenant_or_404(db: Session, tenant_id: int) -> Tenant:
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id, Tenant.is_active == True).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant não encontrado")
    return tenant


def _get_ui_config(db: Session, tenant_id: int) -> TenantUIConfigResponse:
    config_values = {}
    for key in DEFAULT_UI_CONFIG.keys():
        scoped_key = _tenant_scoped_key(tenant_id, f"ui.{key}")
        config = db.query(SystemConfig).filter(SystemConfig.key == scoped_key).first()
        config_values[key] = config.value if config and config.value else DEFAULT_UI_CONFIG[key]

    return TenantUIConfigResponse(**config_values)


def _upsert_ui_config(
    db: Session,
    tenant_id: int,
    payload: TenantUIConfigUpdate,
    updated_by: int,
):
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        scoped_key = _tenant_scoped_key(tenant_id, f"ui.{key}")
        config = db.query(SystemConfig).filter(SystemConfig.key == scoped_key).first()
        if not config:
            config = SystemConfig(
                key=scoped_key,
                tenant_id=tenant_id,
                description=TENANT_CONFIG_DESCRIPTIONS.get(f"ui.{key}"),
            )
            db.add(config)
        config.value = value
        config.updated_by = updated_by


def _apply_business_preset(db: Session, preset: str):
    if preset not in PRESET_DEFINITIONS:
        raise HTTPException(status_code=400, detail="Preset inválido")

    definition = PRESET_DEFINITIONS[preset]

    db.query(Category).update({Category.is_active: False}, synchronize_session=False)
    db.query(Location).update({Location.is_active: False}, synchronize_session=False)
    db.query(ImpactLevel).update({ImpactLevel.is_active: False}, synchronize_session=False)

    for name, description in definition["categories"]:
        existing = db.query(Category).filter(Category.name == name).first()
        if existing:
            existing.description = description
            existing.is_active = True
        else:
            db.add(Category(name=name, description=description, is_active=True))

    for name, description in definition["locations"]:
        existing = db.query(Location).filter(Location.name == name).first()
        if existing:
            existing.description = description
            existing.is_active = True
        else:
            db.add(Location(name=name, description=description, is_active=True))

    for name, description, color, severity in definition["impact_levels"]:
        existing = db.query(ImpactLevel).filter(ImpactLevel.name == name).first()
        if existing:
            existing.description = description
            existing.color = color
            existing.severity = severity
            existing.is_active = True
        else:
            db.add(
                ImpactLevel(
                    name=name,
                    description=description,
                    color=color,
                    severity=severity,
                    is_active=True,
                )
            )


@router.get("/onboarding-status", response_model=OnboardingStatusResponse)
async def onboarding_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = _get_current_tenant_or_404(db, current_user.tenant_id)
    return OnboardingStatusResponse(
        onboarding_completed=tenant.onboarding_completed,
        business_type=tenant.business_type,
    )


@router.get("/profile", response_model=TenantProfileResponse)
async def tenant_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tenant = _get_current_tenant_or_404(db, current_user.tenant_id)
    return TenantProfileResponse(
        id=tenant.id,
        name=tenant.name,
        slug=tenant.slug,
        is_active=tenant.is_active,
        business_type=tenant.business_type,
        onboarding_completed=tenant.onboarding_completed,
        onboarding_completed_at=tenant.onboarding_completed_at,
        ui_config=_get_ui_config(db, tenant.id),
    )


@router.get("/ui-config", response_model=TenantUIConfigResponse)
async def tenant_ui_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _get_ui_config(db, current_user.tenant_id)


@router.put("/ui-config", response_model=TenantUIConfigResponse)
async def update_tenant_ui_config(
    payload: TenantUIConfigUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    _upsert_ui_config(db, current_admin.tenant_id, payload, current_admin.id)
    db.commit()
    return _get_ui_config(db, current_admin.tenant_id)


@router.post("/apply-preset", response_model=TenantProfileResponse)
async def apply_preset(
    payload: ApplyPresetRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    _apply_business_preset(db, payload.preset)

    tenant = _get_current_tenant_or_404(db, current_admin.tenant_id)
    tenant.business_type = payload.preset
    db.commit()
    db.refresh(tenant)

    return TenantProfileResponse(
        id=tenant.id,
        name=tenant.name,
        slug=tenant.slug,
        is_active=tenant.is_active,
        business_type=tenant.business_type,
        onboarding_completed=tenant.onboarding_completed,
        onboarding_completed_at=tenant.onboarding_completed_at,
        ui_config=_get_ui_config(db, tenant.id),
    )


@router.post("/complete-onboarding", response_model=TenantProfileResponse)
async def complete_onboarding(
    payload: CompleteOnboardingRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    _apply_business_preset(db, payload.business_type)
    _upsert_ui_config(db, current_admin.tenant_id, payload.ui_config, current_admin.id)

    tenant = _get_current_tenant_or_404(db, current_admin.tenant_id)
    tenant.name = payload.display_name.strip()
    tenant.business_type = payload.business_type
    tenant.onboarding_completed = True
    tenant.onboarding_completed_at = datetime.utcnow()

    db.commit()
    db.refresh(tenant)

    request.state.tenant_id = tenant.id
    request.state.tenant_slug = tenant.slug

    return TenantProfileResponse(
        id=tenant.id,
        name=tenant.name,
        slug=tenant.slug,
        is_active=tenant.is_active,
        business_type=tenant.business_type,
        onboarding_completed=tenant.onboarding_completed,
        onboarding_completed_at=tenant.onboarding_completed_at,
        ui_config=_get_ui_config(db, tenant.id),
    )
