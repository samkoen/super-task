"""a052 — versions APK publiées pour mise à jour in-app."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "a052_app_releases"
down_revision: Union[str, None] = "a051_task_message_reads"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_TABLE = "app_releases"


def upgrade() -> None:
    tables = inspect(op.get_bind()).get_table_names()
    if _TABLE in tables:
        return
    op.create_table(
        _TABLE,
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("version_code", sa.Integer(), nullable=False),
        sa.Column("version_name", sa.String(length=32), nullable=False),
        sa.Column("apk_url", sa.String(length=1024), nullable=False),
        sa.Column("published_by_user_id", sa.Uuid(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["published_by_user_id"], ["users.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("version_code", name="uq_app_releases_version_code"),
    )


def downgrade() -> None:
    tables = inspect(op.get_bind()).get_table_names()
    if _TABLE in tables:
        op.drop_table(_TABLE)
