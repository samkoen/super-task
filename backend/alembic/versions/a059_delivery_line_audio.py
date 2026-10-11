"""a059 — enregistrement audio sur une ligne לא תקין."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a059_line_audio"
down_revision: Union[str, None] = "a058_agroline_access"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "delivery_line_answers",
        sa.Column("audio_url", sa.String(length=1024), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("delivery_line_answers", "audio_url")
