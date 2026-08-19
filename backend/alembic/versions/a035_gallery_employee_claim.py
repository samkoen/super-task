"""a035 — galerie : l'oved peut se ramener une recette (employee_can_claim)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a035_gallery_employee_claim"
down_revision: Union[str, None] = "a034_completion_requirements"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "task_gallery_items",
        sa.Column(
            "employee_can_claim",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "task_gallery_items",
        sa.Column("min_video_seconds", sa.Integer(), nullable=True),
    )
    op.add_column(
        "task_gallery_items",
        sa.Column("completion_requirements", sa.JSON(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("task_gallery_items", "completion_requirements")
    op.drop_column("task_gallery_items", "min_video_seconds")
    op.drop_column("task_gallery_items", "employee_can_claim")
