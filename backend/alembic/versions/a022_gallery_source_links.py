"""Liens galerie ↔ occurrence (provenance + anti-doublon)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a022_gallery_source_links"
down_revision: Union[str, None] = "a021_task_gallery_items"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "task_gallery_items",
        sa.Column("source_occurrence_id", sa.Uuid(), nullable=True),
    )
    op.create_foreign_key(
        "fk_task_gallery_items_source_occurrence_id",
        "task_gallery_items",
        "task_occurrences",
        ["source_occurrence_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_task_gallery_items_source_occurrence_id",
        "task_gallery_items",
        ["source_occurrence_id"],
        unique=True,
    )

    op.add_column(
        "task_occurrences",
        sa.Column("source_gallery_item_id", sa.Uuid(), nullable=True),
    )
    op.create_foreign_key(
        "fk_task_occurrences_source_gallery_item_id",
        "task_occurrences",
        "task_gallery_items",
        ["source_gallery_item_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_task_occurrences_source_gallery_item_id",
        "task_occurrences",
        ["source_gallery_item_id"],
    )

    op.add_column(
        "task_templates",
        sa.Column("source_gallery_item_id", sa.Uuid(), nullable=True),
    )
    op.create_foreign_key(
        "fk_task_templates_source_gallery_item_id",
        "task_templates",
        "task_gallery_items",
        ["source_gallery_item_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_task_templates_source_gallery_item_id", "task_templates", type_="foreignkey"
    )
    op.drop_column("task_templates", "source_gallery_item_id")

    op.drop_index(
        "ix_task_occurrences_source_gallery_item_id", table_name="task_occurrences"
    )
    op.drop_constraint(
        "fk_task_occurrences_source_gallery_item_id",
        "task_occurrences",
        type_="foreignkey",
    )
    op.drop_column("task_occurrences", "source_gallery_item_id")

    op.drop_index(
        "ix_task_gallery_items_source_occurrence_id", table_name="task_gallery_items"
    )
    op.drop_constraint(
        "fk_task_gallery_items_source_occurrence_id",
        "task_gallery_items",
        type_="foreignkey",
    )
    op.drop_column("task_gallery_items", "source_occurrence_id")
