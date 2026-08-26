"""a039 — מנהל רשת peut gérer tous les ovdim et les מנהלי סניף."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a039_network_manages_all_workers"
down_revision: Union[str, None] = "a038_direct_chats"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "networks",
        sa.Column(
            "manages_all_workers",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column("networks", "manages_all_workers")
