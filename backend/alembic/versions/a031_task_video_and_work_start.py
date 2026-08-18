"""a031 — min_video_seconds + is_work_start sur templates/occurrences."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a031_task_video_and_work_start"
down_revision: Union[str, None] = "a030_user_branch_memberships"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "task_templates",
        sa.Column("min_video_seconds", sa.Integer(), nullable=True),
    )
    op.add_column(
        "task_templates",
        sa.Column(
            "is_work_start",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.add_column(
        "task_occurrences",
        sa.Column("min_video_seconds", sa.Integer(), nullable=True),
    )
    op.add_column(
        "task_occurrences",
        sa.Column(
            "is_work_start",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )


def downgrade() -> None:
    op.drop_column("task_occurrences", "is_work_start")
    op.drop_column("task_occurrences", "min_video_seconds")
    op.drop_column("task_templates", "is_work_start")
    op.drop_column("task_templates", "min_video_seconds")
