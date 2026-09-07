"""Persist system-bug reports (texte, capture, audio) for in-app inbox."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a047_system_bug_reports"
down_revision: Union[str, None] = "a046_chat_file_attachment"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "system_bug_reports",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("reporter_user_id", sa.Uuid(), nullable=True),
        sa.Column("reporter_name", sa.String(length=200), nullable=False, server_default=""),
        sa.Column("reporter_role", sa.String(length=40), nullable=False, server_default=""),
        sa.Column("branch_name", sa.String(length=200), nullable=False, server_default=""),
        sa.Column("network_name", sa.String(length=200), nullable=False, server_default=""),
        sa.Column("note", sa.String(length=4000), nullable=False, server_default=""),
        sa.Column("route", sa.String(length=500), nullable=False, server_default=""),
        sa.Column("trail", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("app_version", sa.String(length=50), nullable=False, server_default=""),
        sa.Column("screenshot_url", sa.String(length=1024), nullable=True),
        sa.Column("audio_url", sa.String(length=1024), nullable=True),
        sa.Column("github_issue_url", sa.String(length=500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["reporter_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_system_bug_reports_reporter_user_id",
        "system_bug_reports",
        ["reporter_user_id"],
    )
    op.create_index(
        "ix_system_bug_reports_created_at",
        "system_bug_reports",
        ["created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_system_bug_reports_created_at", table_name="system_bug_reports")
    op.drop_index("ix_system_bug_reports_reporter_user_id", table_name="system_bug_reports")
    op.drop_table("system_bug_reports")
