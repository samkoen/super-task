"""a044 — suivi chat : rappel + clôture explicite (sans lecture)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "a044_chat_follow_up"
down_revision: Union[str, None] = "a043_attendance_work_end"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _columns(table: str) -> set[str]:
    return {col["name"] for col in inspect(op.get_bind()).get_columns(table)}


def upgrade() -> None:
    cols = _columns("task_occurrences")
    if "chat_follow_up_at" not in cols:
        op.add_column(
            "task_occurrences",
            sa.Column("chat_follow_up_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index(
            "ix_task_occurrences_chat_follow_up_at",
            "task_occurrences",
            ["chat_follow_up_at"],
        )
    if "chat_resolved_at" not in cols:
        op.add_column(
            "task_occurrences",
            sa.Column("chat_resolved_at", sa.DateTime(timezone=True), nullable=True),
        )


def downgrade() -> None:
    cols = _columns("task_occurrences")
    if "chat_follow_up_at" in cols:
        op.drop_index("ix_task_occurrences_chat_follow_up_at", table_name="task_occurrences")
        op.drop_column("task_occurrences", "chat_follow_up_at")
    if "chat_resolved_at" in cols:
        op.drop_column("task_occurrences", "chat_resolved_at")
