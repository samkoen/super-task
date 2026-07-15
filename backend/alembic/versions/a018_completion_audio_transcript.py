"""Transcription audio de clôture employé pour le manager."""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a018_completion_audio_transcript"
down_revision: Union[str, None] = "a017_task_completion_review"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "task_completions",
        sa.Column("audio_transcript", sa.String(length=2000), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("task_completions", "audio_transcript")
