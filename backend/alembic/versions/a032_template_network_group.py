"""a032 — network_group_id pour copies קבועות sur tout le réseau."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a032_template_network_group"
down_revision: Union[str, None] = "a031_task_video_and_work_start"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "task_templates",
        sa.Column("network_group_id", sa.Uuid(), nullable=True),
    )
    op.create_index(
        "ix_task_templates_network_group_id",
        "task_templates",
        ["network_group_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_task_templates_network_group_id", table_name="task_templates")
    op.drop_column("task_templates", "network_group_id")
