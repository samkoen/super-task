"""a033 — network_group_id pour copies מזדמנות sur tout le réseau."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a033_occurrence_network_group"
down_revision: Union[str, None] = "a032_template_network_group"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "task_occurrences",
        sa.Column("network_group_id", sa.Uuid(), nullable=True),
    )
    op.create_index(
        "ix_task_occurrences_network_group_id",
        "task_occurrences",
        ["network_group_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_task_occurrences_network_group_id", table_name="task_occurrences")
    op.drop_column("task_occurrences", "network_group_id")
