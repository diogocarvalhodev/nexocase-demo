from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class PresetCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: Optional[str] = None
    config: Dict[str, Any]


class PresetUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    description: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    is_favorite: Optional[bool] = None


class PresetResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    config: Dict[str, Any]
    is_favorite: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
