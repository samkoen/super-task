"""a062 — délai de conservation des médias d'une tâche terminée."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a062_media_retention_days"
down_revision: Union[str, None] = "a061_order_readings"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "app_settings",
        sa.Column("key", sa.String(length=64), primary_key=True),
        sa.Column("value", sa.String(length=64), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.execute(
        "INSERT INTO app_settings (key, value, updated_at) "
        "VALUES ('media_retention_days', '1', CURRENT_TIMESTAMP)"
    )


def downgrade() -> None:
    op.drop_table("app_settings")
