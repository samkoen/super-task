"""Transcript audio clôture — langue employé."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a019_audio_transcript_employee"
down_revision: Union[str, None] = "a018_completion_audio_transcript"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "task_completions",
        sa.Column("audio_transcript_employee", sa.String(2000), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("task_completions", "audio_transcript_employee")
