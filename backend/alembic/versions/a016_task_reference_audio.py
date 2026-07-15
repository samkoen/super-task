"""Média audio de référence sur définitions de tâches."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a016_task_reference_audio"
down_revision: Union[str, None] = "a015_task_reference_media"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "task_templates",
        sa.Column("reference_audio_url", sa.String(500), nullable=True),
    )
    op.add_column(
        "task_occurrences",
        sa.Column("reference_audio_url", sa.String(500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("task_occurrences", "reference_audio_url")
    op.drop_column("task_templates", "reference_audio_url")
