"""Messages chat tâche (oved ↔ menahel)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a025_task_messages"
down_revision: Union[str, None] = "a024_ops_category"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "task_messages",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "occurrence_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("task_occurrences.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "sender_user_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("body", sa.String(length=2000), nullable=True),
        sa.Column("photo_url", sa.String(length=1024), nullable=True),
        sa.Column("video_url", sa.String(length=1024), nullable=True),
        sa.Column("audio_url", sa.String(length=1024), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_task_messages_occurrence_created",
        "task_messages",
        ["occurrence_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_task_messages_occurrence_created", table_name="task_messages")
    op.drop_table("task_messages")
