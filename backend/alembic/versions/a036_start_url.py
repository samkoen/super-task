"""a036 — start_url sur templates et occurrences (ouverture web au start)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a036_start_url"
down_revision: Union[str, None] = "a035_gallery_employee_claim"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "task_templates",
        sa.Column("start_url", sa.String(length=1024), nullable=True),
    )
    op.add_column(
        "task_occurrences",
        sa.Column("start_url", sa.String(length=1024), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("task_occurrences", "start_url")
    op.drop_column("task_templates", "start_url")
