"""a058 — accès Agroline oui/non sur le compte enregistré."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a058_agroline_access"
down_revision: Union[str, None] = "a057_line_price"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "agroline_accounts",
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
    )


def downgrade() -> None:
    op.drop_column("agroline_accounts", "enabled")
