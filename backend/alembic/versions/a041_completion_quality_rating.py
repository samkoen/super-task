"""a041 — note 1-5 du menahel à l'approbation."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a041_completion_quality_rating"
down_revision: Union[str, None] = "a040_gallery_start_url"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "task_completions",
        sa.Column("quality_rating", sa.SmallInteger(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("task_completions", "quality_rating")
