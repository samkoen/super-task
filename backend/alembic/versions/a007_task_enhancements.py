"""Migration — types tâches, délégation, démarrage, biweekly."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a007_task_enhancements"
down_revision: Union[str, None] = "a006_tasks"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "task_templates",
        sa.Column("task_kind", sa.String(length=20), nullable=False, server_default="fixed"),
    )
    op.add_column(
        "task_templates",
        sa.Column("photo_required", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column("task_templates", sa.Column("biweekly_anchor", sa.DateTime(timezone=True), nullable=True))

    op.add_column(
        "task_occurrences",
        sa.Column("task_kind", sa.String(length=20), nullable=False, server_default="fixed"),
    )
    op.add_column("task_occurrences", sa.Column("manager_user_id", sa.Uuid(), nullable=True))
    op.add_column(
        "task_occurrences",
        sa.Column("photo_required", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column("task_occurrences", sa.Column("started_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("task_occurrences", sa.Column("started_by_id", sa.Uuid(), nullable=True))
    op.add_column("task_occurrences", sa.Column("created_by_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "fk_task_occurrences_manager_user_id",
        "task_occurrences",
        "users",
        ["manager_user_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_task_occurrences_started_by_id",
        "task_occurrences",
        "users",
        ["started_by_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_task_occurrences_created_by_id",
        "task_occurrences",
        "users",
        ["created_by_id"],
        ["id"],
    )
    op.create_index("ix_task_occurrences_manager_user_id", "task_occurrences", ["manager_user_id"])


def downgrade() -> None:
    op.drop_index("ix_task_occurrences_manager_user_id", table_name="task_occurrences")
    op.drop_constraint("fk_task_occurrences_created_by_id", "task_occurrences", type_="foreignkey")
    op.drop_constraint("fk_task_occurrences_started_by_id", "task_occurrences", type_="foreignkey")
    op.drop_constraint("fk_task_occurrences_manager_user_id", "task_occurrences", type_="foreignkey")
    op.drop_column("task_occurrences", "created_by_id")
    op.drop_column("task_occurrences", "started_by_id")
    op.drop_column("task_occurrences", "started_at")
    op.drop_column("task_occurrences", "photo_required")
    op.drop_column("task_occurrences", "manager_user_id")
    op.drop_column("task_occurrences", "task_kind")
    op.drop_column("task_templates", "biweekly_anchor")
    op.drop_column("task_templates", "photo_required")
    op.drop_column("task_templates", "task_kind")
