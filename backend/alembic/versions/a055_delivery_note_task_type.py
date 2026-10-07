"""a055 — le modèle de תעודה porte un type, recopié à l'ouverture."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a055_note_task_type"
down_revision: Union[str, None] = "a054_note_branch_null"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("task_templates", sa.Column("delivery_note_task_type", sa.String(32), nullable=True))
    op.add_column(
        "delivery_note_openings",
        sa.Column("task_type", sa.String(32), nullable=False, server_default="line_check"),
    )
    op.execute(
        "UPDATE task_templates SET delivery_note_task_type = 'line_check' "
        "WHERE opened_by_delivery_note IS TRUE AND delivery_note_task_type IS NULL"
    )


def downgrade() -> None:
    op.drop_column("delivery_note_openings", "task_type")
    op.drop_column("task_templates", "delivery_note_task_type")
