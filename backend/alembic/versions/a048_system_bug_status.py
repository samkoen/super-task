"""a048 — statut ouverte/fermée des דיווח תקלות מערכת."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "a048_system_bug_status"
down_revision: Union[str, None] = "a047_system_bug_reports"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    cols = {col["name"] for col in inspect(op.get_bind()).get_columns("system_bug_reports")}
    if "status" not in cols:
        op.add_column(
            "system_bug_reports",
            sa.Column("status", sa.String(length=20), nullable=False, server_default="open"),
        )
        op.create_index("ix_system_bug_reports_status", "system_bug_reports", ["status"])


def downgrade() -> None:
    cols = {col["name"] for col in inspect(op.get_bind()).get_columns("system_bug_reports")}
    if "status" in cols:
        op.drop_index("ix_system_bug_reports_status", table_name="system_bug_reports")
        op.drop_column("system_bug_reports", "status")
