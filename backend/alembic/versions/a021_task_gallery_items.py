"""Table galerie de tâches réutilisables."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a021_task_gallery_items"
down_revision: Union[str, None] = "a020_media_purge_and_url_width"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "task_gallery_items",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("network_id", sa.Uuid(), sa.ForeignKey("networks.id"), nullable=False),
        sa.Column("branch_id", sa.Uuid(), sa.ForeignKey("branches.id"), nullable=True),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("description", sa.String(length=2000), nullable=False, server_default=""),
        sa.Column("task_kind", sa.String(length=20), nullable=False),
        sa.Column("recurrence", sa.String(length=20), nullable=True),
        sa.Column("due_time", sa.String(length=8), nullable=True),
        sa.Column("weekly_days", sa.String(length=32), nullable=True),
        sa.Column("monthly_day", sa.Integer(), nullable=True),
        sa.Column("photo_required", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("reference_photo_url", sa.String(length=1024), nullable=True),
        sa.Column("reference_video_url", sa.String(length=1024), nullable=True),
        sa.Column("reference_audio_url", sa.String(length=1024), nullable=True),
        sa.Column("created_by_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_task_gallery_items_network_id", "task_gallery_items", ["network_id"])
    op.create_index("ix_task_gallery_items_branch_id", "task_gallery_items", ["branch_id"])
    op.create_index("ix_task_gallery_items_task_kind", "task_gallery_items", ["task_kind"])


def downgrade() -> None:
    op.drop_index("ix_task_gallery_items_task_kind", table_name="task_gallery_items")
    op.drop_index("ix_task_gallery_items_branch_id", table_name="task_gallery_items")
    op.drop_index("ix_task_gallery_items_network_id", table_name="task_gallery_items")
    op.drop_table("task_gallery_items")
