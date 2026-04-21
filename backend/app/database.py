from sqlalchemy import create_engine
from sqlalchemy import event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, with_loader_criteria
from app.config import settings
from app.utils.tenant import get_current_tenant_id

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


@event.listens_for(SessionLocal, "do_orm_execute")
def _add_tenant_criteria(execute_state):
    if not execute_state.is_select:
        return

    tenant_id = get_current_tenant_id()
    if tenant_id is None:
        return

    from app.models.user import User
    from app.models.school import School
    from app.models.incident import Incident
    from app.models.refresh_token import RefreshToken
    from app.models.preset import DashboardPreset
    from app.models.report import ReportTemplate
    from app.models.config import Category, Location, ImpactLevel, ActivityLog, SystemConfig

    tenant_models = [
        User,
        School,
        Incident,
        RefreshToken,
        DashboardPreset,
        ReportTemplate,
        Category,
        Location,
        ImpactLevel,
        ActivityLog,
        SystemConfig,
    ]

    statement = execute_state.statement
    for model in tenant_models:
        statement = statement.options(
            with_loader_criteria(
                model,
                lambda cls: cls.tenant_id == tenant_id,
                include_aliases=True,
            )
        )
    execute_state.statement = statement


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
