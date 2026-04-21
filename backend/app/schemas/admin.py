from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# Category Schemas
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = "#3B82F6"


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None


class CategoryResponse(CategoryBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Location Schemas
class LocationBase(BaseModel):
    name: str
    description: Optional[str] = None


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class LocationResponse(LocationBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Impact Level Schemas
class ImpactLevelBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = "#6B7280"
    severity: Optional[int] = 1


class ImpactLevelCreate(ImpactLevelBase):
    pass


class ImpactLevelUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    severity: Optional[int] = None
    is_active: Optional[bool] = None


class ImpactLevelResponse(ImpactLevelBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Activity Log Schemas
class ActivityLogResponse(BaseModel):
    id: int
    user_id: int
    action: str
    entity_type: str
    entity_id: Optional[int]
    description: str
    ip_address: Optional[str]
    request_id: Optional[str]
    session_jti: Optional[str]
    created_at: datetime
    user_name: Optional[str] = None

    class Config:
        from_attributes = True


# System Config Schemas
class SystemConfigBase(BaseModel):
    key: str
    value: Optional[str] = None
    description: Optional[str] = None


class SystemConfigCreate(SystemConfigBase):
    pass


class SystemConfigUpdate(BaseModel):
    value: Optional[str] = None
    description: Optional[str] = None


class SystemConfigResponse(SystemConfigBase):
    id: int
    updated_at: datetime
    updated_by: Optional[int]

    class Config:
        from_attributes = True


# Archive Schemas
class ArchiveRequest(BaseModel):
    incident_ids: Optional[List[int]] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    archive_all: bool = False


class ArchiveResponse(BaseModel):
    archived_count: int
    message: str


# Stats Response
class AdminStatsResponse(BaseModel):
    total_users: int
    active_users: int
    total_schools: int
    active_schools: int
    total_incidents: int
    archived_incidents: int
    total_categories: int
    total_locations: int
    total_impact_levels: int


class AuditRetentionRunResponse(BaseModel):
    retention_days: int
    cutoff_utc: datetime
    anonymized_activity_logs: int
    removed_refresh_tokens: int
    dry_run: bool


class AuditRetentionRequest(BaseModel):
    retention_days: Optional[int] = None
    dry_run: bool = False


class AuditRetentionHealthResponse(BaseModel):
    status: str
    message: str
    schedule_enabled: bool
    interval_hours: int
    max_expected_delay_hours: int
    is_stale: bool
    last_run_at: Optional[datetime] = None
    next_expected_run_at: Optional[datetime] = None
    last_status: Optional[str] = None
    last_error: Optional[str] = None
