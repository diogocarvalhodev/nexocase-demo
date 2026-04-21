"""update incident status values

Revision ID: 7cbb5b1e4b2a
Revises: 6621505188b5
Create Date: 2026-03-03 10:15:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '7cbb5b1e4b2a'
down_revision: Union[str, None] = '6621505188b5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE incidents
        SET status = 'Aguardando Validação'
        WHERE status IN ('Pendente de Validacao', 'Pendente de Validação');
        """
    )
    op.execute(
        """
        UPDATE incidents
        SET status = 'Aprovada'
        WHERE status IN ('Aberto', 'Em Andamento', 'Resolvido')
          AND validated_by IS NOT NULL;
        """
    )
    op.execute(
        """
        UPDATE incidents
        SET status = 'Fechado'
        WHERE status IN ('Aberto', 'Em Andamento', 'Resolvido', 'Fechado')
          AND validated_by IS NULL;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE incidents
        SET status = 'Pendente de Validacao'
        WHERE status = 'Aguardando Validação';
        """
    )
    op.execute(
        """
        UPDATE incidents
        SET status = 'Aberto'
        WHERE status = 'Aprovada';
        """
    )
