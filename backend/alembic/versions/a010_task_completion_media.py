"""Add video and audio paths to task completions."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a010_task_completion_media"
down_revision: Union[str, None] = "a009_english_role_values"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("task_completions", sa.Column("video_path", sa.String(length=500), nullable=True))
    op.add_column("task_completions", sa.Column("audio_path", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("task_completions", "audio_path")
    op.drop_column("task_completions", "video_path")
