"""Rétention médias + URLs Blob plus larges."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a020_media_purge_and_url_width"
down_revision: Union[str, None] = "a019_audio_transcript_employee"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_URL_TABLES = (
    ("task_templates", ("reference_photo_url", "reference_video_url", "reference_audio_url")),
    ("task_occurrences", ("reference_photo_url", "reference_video_url", "reference_audio_url")),
    ("task_completions", ("photo_path", "video_path", "audio_path")),
    ("issue_reports", ("photo_url", "video_url", "audio_url")),
)


def upgrade() -> None:
    op.add_column(
        "task_occurrences",
        sa.Column("media_purge_after", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_task_occurrences_media_purge_after",
        "task_occurrences",
        ["media_purge_after"],
    )
    for table, columns in _URL_TABLES:
        for column in columns:
            op.alter_column(
                table,
                column,
                existing_type=sa.String(length=500),
                type_=sa.String(length=1024),
                existing_nullable=True,
            )


def downgrade() -> None:
    for table, columns in _URL_TABLES:
        for column in columns:
            op.alter_column(
                table,
                column,
                existing_type=sa.String(length=1024),
                type_=sa.String(length=500),
                existing_nullable=True,
            )
    op.drop_index("ix_task_occurrences_media_purge_after", table_name="task_occurrences")
    op.drop_column("task_occurrences", "media_purge_after")
