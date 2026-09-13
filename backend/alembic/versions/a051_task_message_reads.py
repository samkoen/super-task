"""a051 — last_read des messages chat tâche (badges non-lus manager)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "a051_task_message_reads"
down_revision: Union[str, None] = "a050_completion_media_ready"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_TABLE = "task_message_reads"


def upgrade() -> None:
    tables = inspect(op.get_bind()).get_table_names()
    if _TABLE in tables:
        return
    op.create_table(
        _TABLE,
        sa.Column("occurrence_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("user_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("last_read_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["occurrence_id"], ["task_occurrences.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("occurrence_id", "user_id"),
    )


def downgrade() -> None:
    tables = inspect(op.get_bind()).get_table_names()
    if _TABLE in tables:
        op.drop_table(_TABLE)
