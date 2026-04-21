"""add refresh tokens table

Revision ID: c4e7f1a9d2b3
Revises: b1d9c2a4f6e1
Create Date: 2026-03-05 21:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4e7f1a9d2b3'
down_revision: Union[str, None] = 'b1d9c2a4f6e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = inspector.get_table_names()

    if 'refresh_tokens' not in table_names:
        op.create_table(
            'refresh_tokens',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('token_jti', sa.String(length=64), nullable=False),
            sa.Column('issued_at', sa.DateTime(), nullable=False),
            sa.Column('expires_at', sa.DateTime(), nullable=False),
            sa.Column('revoked_at', sa.DateTime(), nullable=True),
            sa.Column('replaced_by_jti', sa.String(length=64), nullable=True),
            sa.Column('ip_address', sa.String(length=64), nullable=True),
            sa.Column('user_agent', sa.String(length=512), nullable=True),
        )
    else:
        existing_columns = {col['name'] for col in inspector.get_columns('refresh_tokens')}
        if 'replaced_by_jti' not in existing_columns:
            op.add_column('refresh_tokens', sa.Column('replaced_by_jti', sa.String(length=64), nullable=True))
        if 'ip_address' not in existing_columns:
            op.add_column('refresh_tokens', sa.Column('ip_address', sa.String(length=64), nullable=True))
        if 'user_agent' not in existing_columns:
            op.add_column('refresh_tokens', sa.Column('user_agent', sa.String(length=512), nullable=True))

    index_names = {idx['name'] for idx in inspector.get_indexes('refresh_tokens')}
    if 'ix_refresh_tokens_id' not in index_names:
        op.create_index('ix_refresh_tokens_id', 'refresh_tokens', ['id'], unique=False)
    if 'ix_refresh_tokens_user_id' not in index_names:
        op.create_index('ix_refresh_tokens_user_id', 'refresh_tokens', ['user_id'], unique=False)
    if 'ix_refresh_tokens_token_jti' not in index_names:
        op.create_index('ix_refresh_tokens_token_jti', 'refresh_tokens', ['token_jti'], unique=True)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = inspector.get_table_names()
    if 'refresh_tokens' not in table_names:
        return

    index_names = {idx['name'] for idx in inspector.get_indexes('refresh_tokens')}
    if 'ix_refresh_tokens_token_jti' in index_names:
        op.drop_index('ix_refresh_tokens_token_jti', table_name='refresh_tokens')
    if 'ix_refresh_tokens_user_id' in index_names:
        op.drop_index('ix_refresh_tokens_user_id', table_name='refresh_tokens')
    if 'ix_refresh_tokens_id' in index_names:
        op.drop_index('ix_refresh_tokens_id', table_name='refresh_tokens')
    op.drop_table('refresh_tokens')
