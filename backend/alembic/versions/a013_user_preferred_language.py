"""Add preferred_language to users."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a013_user_preferred_language"
down_revision: Union[str, None] = "a012_issue_reports"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("preferred_language", sa.String(length=8), nullable=False, server_default="he"),
    )


def downgrade() -> None:
    op.drop_column("users", "preferred_language")
