"""add user token version

Revision ID: d9a8b7c6e5f4
Revises: c4e7f1a9d2b3
Create Date: 2026-03-05 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd9a8b7c6e5f4'
down_revision: Union[str, None] = 'c4e7f1a9d2b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {col['name'] for col in inspector.get_columns('users')}

    if 'token_version' not in existing_columns:
        op.add_column('users', sa.Column('token_version', sa.Integer(), nullable=False, server_default='0'))
        op.alter_column('users', 'token_version', server_default=None)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {col['name'] for col in inspector.get_columns('users')}

    if 'token_version' in existing_columns:
        op.drop_column('users', 'token_version')
