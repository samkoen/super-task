"""a027 task message i18n + audio transcripts."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a027_task_message_i18n"
down_revision: Union[str, None] = "a026_manager_next_task"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "task_messages",
        sa.Column("body_translated", sa.String(length=2000), nullable=True),
    )
    op.add_column(
        "task_messages",
        sa.Column("audio_transcript", sa.Text(), nullable=True),
    )
    op.add_column(
        "task_messages",
        sa.Column("audio_transcript_sender", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("task_messages", "audio_transcript_sender")
    op.drop_column("task_messages", "audio_transcript")
    op.drop_column("task_messages", "body_translated")
