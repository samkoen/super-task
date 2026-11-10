"""Add slot_index to task_messages (étape visée par un message du chat tâche)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a064_task_message_slot"
down_revision: Union[str, None] = "a063_template_overrides"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("task_messages", sa.Column("slot_index", sa.SmallInteger(), nullable=True))


def downgrade() -> None:
    op.drop_column("task_messages", "slot_index")
