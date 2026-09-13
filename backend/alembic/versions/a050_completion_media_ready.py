"""a050 — media_ready sur les complétions (file ichour après lecture Blob)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "a050_completion_media_ready"
down_revision: Union[str, None] = "a049_system_bug_comments"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    cols = {col["name"] for col in inspect(op.get_bind()).get_columns("task_completions")}
    if "media_ready" not in cols:
        op.add_column(
            "task_completions",
            sa.Column(
                "media_ready",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("true"),
            ),
        )


def downgrade() -> None:
    cols = {col["name"] for col in inspect(op.get_bind()).get_columns("task_completions")}
    if "media_ready" in cols:
        op.drop_column("task_completions", "media_ready")
