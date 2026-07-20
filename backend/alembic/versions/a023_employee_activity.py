"""Champs activité employé : pause + inactivité."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a023_employee_activity"
down_revision: Union[str, None] = "a022_gallery_source_links"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("on_break_since", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("idle_since", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("inactivity_notified_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "inactivity_notified_at")
    op.drop_column("users", "idle_since")
    op.drop_column("users", "on_break_since")
