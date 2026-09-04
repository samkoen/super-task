"""a046 — pièce jointe fichier dans les chats tâche et שיחה."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "a046_chat_file_attachment"
down_revision: Union[str, None] = "a045_fix_stale_migrated_photo"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_TABLES = ("task_messages", "direct_messages")


def _columns(table: str) -> set[str]:
    return {col["name"] for col in inspect(op.get_bind()).get_columns(table)}


def upgrade() -> None:
    for table in _TABLES:
        cols = _columns(table)
        if "file_url" not in cols:
            op.add_column(table, sa.Column("file_url", sa.String(length=1024), nullable=True))
        if "file_name" not in cols:
            op.add_column(table, sa.Column("file_name", sa.String(length=255), nullable=True))


def downgrade() -> None:
    for table in _TABLES:
        cols = _columns(table)
        if "file_name" in cols:
            op.drop_column(table, "file_name")
        if "file_url" in cols:
            op.drop_column(table, "file_url")
