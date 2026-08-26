"""a040 — start_url sur les modèles galerie."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a040_gallery_start_url"
down_revision: Union[str, None] = "a039_network_manages_all_workers"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.add_column(
        "task_gallery_items",
        sa.Column("start_url", sa.String(length=1024), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("task_gallery_items", "start_url")
