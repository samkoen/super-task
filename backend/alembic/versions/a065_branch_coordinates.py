"""branch coordinates (GPS check on filmed media)

Revision ID: a065_branch_coordinates
Revises: a064_task_message_slot
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a065_branch_coordinates"
down_revision: Union[str, None] = "a064_task_message_slot"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("branches", sa.Column("latitude", sa.Float(), nullable=True))
    op.add_column("branches", sa.Column("longitude", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("branches", "longitude")
    op.drop_column("branches", "latitude")
