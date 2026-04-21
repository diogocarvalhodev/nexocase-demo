from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
import re

from app.database import get_db
from app.models.config import Category, Location, ImpactLevel
from app.models.school import School
from app.schemas.admin import CategoryResponse, LocationResponse, ImpactLevelResponse
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/options", tags=["Opções"])


@router.get("/categories", response_model=List[CategoryResponse])
async def get_categories(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Obter lista de setores ativos para formulários."""
    return db.query(Category).filter(Category.is_active == True).order_by(Category.name).all()


@router.get("/locations", response_model=List[LocationResponse])
async def get_locations(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Obter lista de localizações ativas para formulários."""
    return db.query(Location).filter(Location.is_active == True).order_by(Location.name).all()


@router.get("/impact-levels", response_model=List[ImpactLevelResponse])
async def get_impact_levels(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Obter lista de níveis de impacto ativos para formulários."""
    return db.query(ImpactLevel).filter(ImpactLevel.is_active == True).order_by(ImpactLevel.severity).all()


def _extract_region_from_address(address: str) -> str:
    if not address:
        return "Não informado"

    match = re.search(r" - ([^,]+)", address)
    if match:
        return match.group(1).strip()

    parts = [part.strip() for part in address.split(",") if part.strip()]
    if len(parts) >= 2:
        return parts[-2]

    return "Não informado"


@router.get("/regions", response_model=List[str])
async def get_regions(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Obter lista de regioes/bairros a partir do endereco das escolas."""
    regions = {
        _extract_region_from_address(school.address)
        for school in db.query(School).all()
    }
    return sorted(regions)
