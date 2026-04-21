from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.preset import DashboardPreset
from app.models.user import User
from app.schemas.preset import PresetCreate, PresetResponse, PresetUpdate
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/presets", tags=["Presets"])


@router.get("", response_model=List[PresetResponse])
async def list_presets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(DashboardPreset)
        .filter(DashboardPreset.user_id == current_user.id)
        .order_by(DashboardPreset.is_favorite.desc(), DashboardPreset.updated_at.desc())
        .all()
    )


@router.post("", response_model=PresetResponse)
async def create_preset(
    payload: PresetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    preset = DashboardPreset(
        user_id=current_user.id,
        name=payload.name.strip(),
        description=payload.description,
        config=payload.config,
    )
    db.add(preset)
    db.commit()
    db.refresh(preset)
    return preset


@router.put("/{preset_id}", response_model=PresetResponse)
async def update_preset(
    preset_id: int,
    payload: PresetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    preset = (
        db.query(DashboardPreset)
        .filter(DashboardPreset.id == preset_id, DashboardPreset.user_id == current_user.id)
        .first()
    )
    if not preset:
        raise HTTPException(status_code=404, detail="Preset não encontrado")

    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        data["name"] = data["name"].strip()

    for key, value in data.items():
        setattr(preset, key, value)

    db.commit()
    db.refresh(preset)
    return preset


@router.delete("/{preset_id}")
async def delete_preset(
    preset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    preset = (
        db.query(DashboardPreset)
        .filter(DashboardPreset.id == preset_id, DashboardPreset.user_id == current_user.id)
        .first()
    )
    if not preset:
        raise HTTPException(status_code=404, detail="Preset não encontrado")

    db.delete(preset)
    db.commit()
    return {"message": "Preset removido"}
