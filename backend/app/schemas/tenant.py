from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

BusinessType = Literal["education", "condominium", "shopping"]


class TenantUIConfigResponse(BaseModel):
    app_name: str
    subtitle: str
    primary_color: str
    accent_color: str


class TenantUIConfigUpdate(BaseModel):
    app_name: Optional[str] = Field(default=None, min_length=2, max_length=80)
    subtitle: Optional[str] = Field(default=None, min_length=2, max_length=120)
    primary_color: Optional[str] = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")
    accent_color: Optional[str] = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")


class TenantProfileResponse(BaseModel):
    id: int
    name: str
    slug: str
    is_active: bool
    business_type: Optional[str] = None
    onboarding_completed: bool
    onboarding_completed_at: Optional[datetime] = None
    ui_config: TenantUIConfigResponse


class ApplyPresetRequest(BaseModel):
    preset: BusinessType


class OnboardingStatusResponse(BaseModel):
    onboarding_completed: bool
    business_type: Optional[str] = None


class CompleteOnboardingRequest(BaseModel):
    display_name: str = Field(min_length=2, max_length=150)
    business_type: BusinessType
    ui_config: TenantUIConfigUpdate
