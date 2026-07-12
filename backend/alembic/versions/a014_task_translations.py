"""Cache traductions AI des occurrences de tâches."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a014_task_translations"
down_revision: Union[str, None] = "a013_user_preferred_language"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "task_occurrence_translations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("occurrence_id", sa.Uuid(), nullable=False),
        sa.Column("language", sa.String(length=8), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("spoken_text", sa.String(length=1500), nullable=False, server_default=""),
        sa.Column("source_hash", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["occurrence_id"], ["task_occurrences.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("occurrence_id", "language", name="uq_task_occurrence_translation"),
    )
    op.create_index(
        "ix_task_occurrence_translations_occurrence_id",
        "task_occurrence_translations",
        ["occurrence_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_task_occurrence_translations_occurrence_id", table_name="task_occurrence_translations")
    op.drop_table("task_occurrence_translations")
