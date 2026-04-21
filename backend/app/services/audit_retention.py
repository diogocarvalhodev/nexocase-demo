from datetime import datetime, timedelta
from typing import Optional, Tuple

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.models.config import ActivityLog, SystemConfig
from app.models.refresh_token import RefreshToken


def resolve_retention_days(
    db: Session,
    override_days: Optional[int],
    default_days: int,
) -> int:
    if override_days is not None:
        return override_days

    retention_cfg = db.query(SystemConfig).filter(SystemConfig.key == "data_retention_days").first()
    if retention_cfg and retention_cfg.value and str(retention_cfg.value).isdigit():
        return int(retention_cfg.value)

    return default_days


def execute_audit_retention(
    db: Session,
    retention_days: int,
    dry_run: bool,
) -> Tuple[datetime, int, int]:
    cutoff = datetime.utcnow() - timedelta(days=retention_days)

    logs_query = db.query(ActivityLog).filter(
        ActivityLog.created_at < cutoff,
        or_(
            ActivityLog.ip_address.isnot(None),
            ActivityLog.request_id.isnot(None),
            ActivityLog.session_jti.isnot(None),
        )
    )
    logs_to_anonymize = logs_query.all()
    anonymized_count = len(logs_to_anonymize)

    refresh_query = db.query(RefreshToken).filter(
        or_(
            RefreshToken.expires_at < cutoff,
            and_(RefreshToken.revoked_at.isnot(None), RefreshToken.revoked_at < cutoff),
        )
    )
    refresh_to_remove = refresh_query.all()
    removed_refresh_count = len(refresh_to_remove)

    if not dry_run:
        for log in logs_to_anonymize:
            log.ip_address = None
            log.request_id = None
            log.session_jti = None

        for token in refresh_to_remove:
            db.delete(token)

        db.commit()

    return cutoff, anonymized_count, removed_refresh_count


def record_audit_retention_metadata(
    db: Session,
    *,
    run_at: datetime,
    cutoff: datetime,
    anonymized_count: int,
    removed_refresh_count: int,
    dry_run: bool,
    trigger: str,
    status: str,
    error_message: str | None = None,
    updated_by: int | None = None,
) -> None:
    entries = {
        "audit_retention_last_run_at": run_at.isoformat(),
        "audit_retention_last_cutoff_utc": cutoff.isoformat(),
        "audit_retention_last_anonymized_count": str(anonymized_count),
        "audit_retention_last_removed_refresh_count": str(removed_refresh_count),
        "audit_retention_last_dry_run": "true" if dry_run else "false",
        "audit_retention_last_trigger": trigger,
        "audit_retention_last_status": status,
        "audit_retention_last_error": error_message or "",
    }

    for key, value in entries.items():
        item = db.query(SystemConfig).filter(SystemConfig.key == key).first()
        if not item:
            item = SystemConfig(key=key)
            db.add(item)
        item.value = value
        item.updated_by = updated_by

    db.commit()
