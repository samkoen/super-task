"""Add issue_reports table and link to user_notifications."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a012_issue_reports"
down_revision: Union[str, None] = "a011_phase5_features"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "issue_reports",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("reporter_user_id", sa.Uuid(), nullable=False),
        sa.Column("branch_id", sa.Uuid(), nullable=False),
        sa.Column("text", sa.String(length=2000), nullable=True),
        sa.Column("photo_url", sa.String(length=500), nullable=True),
        sa.Column("video_url", sa.String(length=500), nullable=True),
        sa.Column("audio_url", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["reporter_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["branch_id"], ["branches.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_issue_reports_branch_id", "issue_reports", ["branch_id"])
    op.create_index("ix_issue_reports_reporter_user_id", "issue_reports", ["reporter_user_id"])
    op.add_column(
        "user_notifications",
        sa.Column("issue_report_id", sa.Uuid(), nullable=True),
    )
    op.create_foreign_key(
        "fk_user_notifications_issue_report_id",
        "user_notifications",
        "issue_reports",
        ["issue_report_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_user_notifications_issue_report_id", "user_notifications", type_="foreignkey")
    op.drop_column("user_notifications", "issue_report_id")
    op.drop_index("ix_issue_reports_reporter_user_id", table_name="issue_reports")
    op.drop_index("ix_issue_reports_branch_id", table_name="issue_reports")
    op.drop_table("issue_reports")
