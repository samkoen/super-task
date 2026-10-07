"""a056 — une ligne de תעודה garde le pays ou le nom affiché dessous."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a056_line_origin"
down_revision: Union[str, None] = "a055_note_task_type"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("delivery_note_lines", sa.Column("origin_name", sa.String(80), nullable=True))


def downgrade() -> None:
    op.drop_column("delivery_note_lines", "origin_name")
