"""Prochaine tâche désignée par le menahel pour un oved."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a026_manager_next_task"
down_revision: Union[str, None] = "a025_task_messages"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "task_occurrences",
        sa.Column("manager_next_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_task_occurrences_manager_next_at",
        "task_occurrences",
        ["manager_next_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_task_occurrences_manager_next_at", table_name="task_occurrences")
    op.drop_column("task_occurrences", "manager_next_at")
