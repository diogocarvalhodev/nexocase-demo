"""add tenant onboarding fields and dashboard presets

Revision ID: f3c2b1a0d9e8
Revises: e1f2a3b4c5d6
Create Date: 2026-03-27 18:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3c2b1a0d9e8'
down_revision: Union[str, None] = 'e1f2a3b4c5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    tenant_columns = {col['name'] for col in inspector.get_columns('tenants')}
    if 'business_type' not in tenant_columns:
        op.add_column('tenants', sa.Column('business_type', sa.String(length=40), nullable=True))
    if 'onboarding_completed' not in tenant_columns:
        op.add_column('tenants', sa.Column('onboarding_completed', sa.Boolean(), nullable=False, server_default=sa.text('false')))
        op.alter_column('tenants', 'onboarding_completed', server_default=None)
    if 'onboarding_completed_at' not in tenant_columns:
        op.add_column('tenants', sa.Column('onboarding_completed_at', sa.DateTime(), nullable=True))

    table_names = set(inspector.get_table_names())
    if 'dashboard_presets' not in table_names:
        op.create_table(
            'dashboard_presets',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('tenant_id', sa.Integer(), sa.ForeignKey('tenants.id'), nullable=False),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('name', sa.String(length=120), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('config', sa.JSON(), nullable=False),
            sa.Column('is_favorite', sa.Boolean(), nullable=False, server_default=sa.text('false')),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        )
        op.create_index('ix_dashboard_presets_id', 'dashboard_presets', ['id'])
        op.create_index('ix_dashboard_presets_tenant_id', 'dashboard_presets', ['tenant_id'])
        op.create_index('ix_dashboard_presets_user_id', 'dashboard_presets', ['user_id'])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    table_names = set(inspector.get_table_names())
    if 'dashboard_presets' in table_names:
        indexes = {idx['name'] for idx in inspector.get_indexes('dashboard_presets')}
        if 'ix_dashboard_presets_user_id' in indexes:
            op.drop_index('ix_dashboard_presets_user_id', table_name='dashboard_presets')
        if 'ix_dashboard_presets_tenant_id' in indexes:
            op.drop_index('ix_dashboard_presets_tenant_id', table_name='dashboard_presets')
        if 'ix_dashboard_presets_id' in indexes:
            op.drop_index('ix_dashboard_presets_id', table_name='dashboard_presets')
        op.drop_table('dashboard_presets')

    tenant_columns = {col['name'] for col in inspector.get_columns('tenants')}
    if 'onboarding_completed_at' in tenant_columns:
        op.drop_column('tenants', 'onboarding_completed_at')
    if 'onboarding_completed' in tenant_columns:
        op.drop_column('tenants', 'onboarding_completed')
    if 'business_type' in tenant_columns:
        op.drop_column('tenants', 'business_type')
