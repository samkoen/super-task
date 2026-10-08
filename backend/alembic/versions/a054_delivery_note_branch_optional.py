"""a054 — une תעודה peut être gardée avant le lien client → סניף."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a054_note_branch_null"
down_revision: Union[str, None] = "a053_delivery_notes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("delivery_notes", "branch_id", existing_type=sa.Uuid(), nullable=True)


def downgrade() -> None:
    op.alter_column("delivery_notes", "branch_id", existing_type=sa.Uuid(), nullable=False)
