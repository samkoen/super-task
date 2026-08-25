"""a037 — photo de profil (avatar) sur users."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a037_user_avatar"
down_revision: Union[str, None] = "a036_start_url"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("avatar_url", sa.String(length=1024), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "avatar_url")
