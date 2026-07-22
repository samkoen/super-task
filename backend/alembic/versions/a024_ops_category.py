"""ops_category sur templates et occurrences (KPI nettoyage / fronts)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a024_ops_category"
down_revision: Union[str, None] = "a023_employee_activity"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "task_templates",
        sa.Column("ops_category", sa.String(length=32), nullable=True),
    )
    op.add_column(
        "task_occurrences",
        sa.Column("ops_category", sa.String(length=32), nullable=True),
    )
    op.create_index(
        "ix_task_occurrences_ops_category",
        "task_occurrences",
        ["ops_category"],
    )


def downgrade() -> None:
    op.drop_index("ix_task_occurrences_ops_category", table_name="task_occurrences")
    op.drop_column("task_occurrences", "ops_category")
    op.drop_column("task_templates", "ops_category")
