"""a057 — prix, poids et photo sur une ligne de תעודה."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a057_line_price"
down_revision: Union[str, None] = "a056_line_origin"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("delivery_note_lines", sa.Column("weight", sa.Float(), nullable=True))
    op.add_column("delivery_note_lines", sa.Column("price", sa.Float(), nullable=True))
    op.add_column("delivery_note_lines", sa.Column("image_url", sa.String(1024), nullable=True))


def downgrade() -> None:
    op.drop_column("delivery_note_lines", "image_url")
    op.drop_column("delivery_note_lines", "price")
    op.drop_column("delivery_note_lines", "weight")
