"""a049 — commentaires inbox sur דיווח תקלות מערכת."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "a049_system_bug_comments"
down_revision: Union[str, None] = "a048_system_bug_status"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    cols = {col["name"] for col in inspect(op.get_bind()).get_columns("system_bug_reports")}
    if "comments" not in cols:
        op.add_column(
            "system_bug_reports",
            sa.Column("comments", sa.Text(), nullable=False, server_default="[]"),
        )


def downgrade() -> None:
    cols = {col["name"] for col in inspect(op.get_bind()).get_columns("system_bug_reports")}
    if "comments" in cols:
        op.drop_column("system_bug_reports", "comments")
