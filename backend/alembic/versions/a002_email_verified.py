"""Ajoute email_verified aux utilisateurs."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a002_email_verified"
down_revision: Union[str, None] = "a001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.execute("UPDATE users SET email_verified = true")


def downgrade() -> None:
    op.drop_column("users", "email_verified")
