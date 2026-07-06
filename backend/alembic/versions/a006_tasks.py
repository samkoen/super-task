"""Migration — module tâches (templates, occurrences, completions)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a006_tasks"
down_revision: Union[str, None] = "a005_user_scope"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "task_templates",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("snif_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("description", sa.String(length=2000), nullable=False, server_default=""),
        sa.Column("recurrence", sa.String(length=20), nullable=False, server_default="once"),
        sa.Column("due_time", sa.String(length=8), nullable=False, server_default="23:59"),
        sa.Column("weekly_days", sa.String(length=32), nullable=True),
        sa.Column("assignee_user_id", sa.Uuid(), nullable=True),
        sa.Column("mahlekha_id", sa.Uuid(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_by_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["assignee_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["mahlekha_id"], ["mahlekhot.id"]),
        sa.ForeignKeyConstraint(["snif_id"], ["snifim.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_task_templates_snif_id", "task_templates", ["snif_id"])

    op.create_table(
        "task_occurrences",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("template_id", sa.Uuid(), nullable=True),
        sa.Column("snif_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("description", sa.String(length=2000), nullable=False, server_default=""),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("assignee_user_id", sa.Uuid(), nullable=True),
        sa.Column("mahlekha_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["assignee_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["mahlekha_id"], ["mahlekhot.id"]),
        sa.ForeignKeyConstraint(["snif_id"], ["snifim.id"]),
        sa.ForeignKeyConstraint(["template_id"], ["task_templates.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_task_occurrences_template_id", "task_occurrences", ["template_id"])
    op.create_index("ix_task_occurrences_snif_id", "task_occurrences", ["snif_id"])
    op.create_index("ix_task_occurrences_due_at", "task_occurrences", ["due_at"])
    op.create_index("ix_task_occurrences_status", "task_occurrences", ["status"])
    op.create_index("ix_task_occurrences_assignee_user_id", "task_occurrences", ["assignee_user_id"])

    op.create_table(
        "task_completions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("occurrence_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("note", sa.String(length=2000), nullable=True),
        sa.Column("photo_path", sa.String(length=500), nullable=True),
        sa.Column("not_completed_reason", sa.String(length=500), nullable=True),
        sa.Column("completed_by_id", sa.Uuid(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["completed_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["occurrence_id"], ["task_occurrences.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("occurrence_id"),
    )


def downgrade() -> None:
    op.drop_table("task_completions")
    op.drop_table("task_occurrences")
    op.drop_table("task_templates")
