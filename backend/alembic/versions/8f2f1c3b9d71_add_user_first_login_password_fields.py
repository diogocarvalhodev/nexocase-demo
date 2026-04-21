"""add user first login password fields

Revision ID: 8f2f1c3b9d71
Revises: 7cbb5b1e4b2a
Create Date: 2026-03-05 18:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8f2f1c3b9d71'
down_revision: Union[str, None] = '7cbb5b1e4b2a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('must_change_password', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('users', sa.Column('temporary_password_issued_at', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('password_changed_at', sa.DateTime(), nullable=True))
    op.alter_column('users', 'must_change_password', server_default=None)


def downgrade() -> None:
    op.drop_column('users', 'password_changed_at')
    op.drop_column('users', 'temporary_password_issued_at')
    op.drop_column('users', 'must_change_password')
