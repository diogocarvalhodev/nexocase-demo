"""add activity trace fields

Revision ID: e1f2a3b4c5d6
Revises: d9a8b7c6e5f4
Create Date: 2026-03-05 22:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e1f2a3b4c5d6'
down_revision: Union[str, None] = 'd9a8b7c6e5f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {col['name'] for col in inspector.get_columns('activity_logs')}

    if 'request_id' not in existing_columns:
        op.add_column('activity_logs', sa.Column('request_id', sa.String(length=36), nullable=True))
    if 'session_jti' not in existing_columns:
        op.add_column('activity_logs', sa.Column('session_jti', sa.String(length=64), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {col['name'] for col in inspector.get_columns('activity_logs')}

    if 'session_jti' in existing_columns:
        op.drop_column('activity_logs', 'session_jti')
    if 'request_id' in existing_columns:
        op.drop_column('activity_logs', 'request_id')
