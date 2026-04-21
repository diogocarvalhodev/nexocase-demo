from pydantic import BaseModel
from typing import Optional


class SchoolBase(BaseModel):
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class SchoolCreate(SchoolBase):
    pass


class SchoolUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None


class SchoolResponse(SchoolBase):
    id: int
    is_active: bool
    incident_count: Optional[int] = 0

    class Config:
        from_attributes = True
