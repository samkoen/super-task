"""Task completion manager review workflow."""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a017_task_completion_review"
down_revision: Union[str, None] = "a016_task_reference_audio"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "task_completions",
        sa.Column("manager_review_status", sa.String(length=20), nullable=True),
    )
    op.add_column(
        "task_completions",
        sa.Column("manager_reviewed_by_id", sa.Uuid(as_uuid=True), nullable=True),
    )
    op.add_column(
        "task_completions",
        sa.Column("manager_reviewed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "task_completions",
        sa.Column("rejection_note", sa.String(length=500), nullable=True),
    )
    op.create_foreign_key(
        "fk_task_completions_manager_reviewed_by",
        "task_completions",
        "users",
        ["manager_reviewed_by_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_task_completions_manager_reviewed_by", "task_completions", type_="foreignkey")
    op.drop_column("task_completions", "rejection_note")
    op.drop_column("task_completions", "manager_reviewed_at")
    op.drop_column("task_completions", "manager_reviewed_by_id")
    op.drop_column("task_completions", "manager_review_status")
