"""awaiting_upload_at on task occurrences, last_seen_at on users (oved sans קליטה)

Revision ID: a067_offline_upload_last_seen
Revises: a066_task_duration_minutes
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a067_offline_upload_last_seen"
down_revision: Union[str, None] = "a066_task_duration_minutes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("task_occurrences", sa.Column("awaiting_upload_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "last_seen_at")
    op.drop_column("task_occurrences", "awaiting_upload_at")
