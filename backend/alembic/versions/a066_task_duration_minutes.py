"""duration_minutes on task templates and occurrences (FLOW 2 « המשימות להיום »)

Revision ID: a066_task_duration_minutes
Revises: a065_branch_coordinates
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a066_task_duration_minutes"
down_revision: Union[str, None] = "a065_branch_coordinates"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("task_templates", sa.Column("duration_minutes", sa.Integer(), nullable=True))
    op.add_column("task_occurrences", sa.Column("duration_minutes", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("task_occurrences", "duration_minutes")
    op.drop_column("task_templates", "duration_minutes")
