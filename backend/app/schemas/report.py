from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ReportTemplateUpdate(BaseModel):
    texto_oficio: str


class ReportTemplateResponse(BaseModel):
    id: int
    texto_oficio: Optional[str] = None
    updated_at: datetime
    updated_by: Optional[int] = None

    class Config:
        from_attributes = True
