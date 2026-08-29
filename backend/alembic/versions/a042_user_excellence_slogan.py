"""a042 — slogan excellence sur le profil oved."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a042_user_excellence_slogan"
down_revision: Union[str, None] = "a041_completion_quality_rating"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("excellence_slogan", sa.String(length=120), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "excellence_slogan")
