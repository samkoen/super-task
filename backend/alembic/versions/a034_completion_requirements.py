"""a034 — exigences de fin de tâche (photo / vidéo×N / audio) en JSON."""

from typing import Sequence, Union
import json

import sqlalchemy as sa
from alembic import op

revision: str = "a034_completion_requirements"
down_revision: Union[str, None] = "a033_occurrence_network_group"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _legacy_reqs(photo_required, min_video_seconds) -> list[dict]:
    try:
        seconds = int(min_video_seconds) if min_video_seconds else 0
    except (TypeError, ValueError):
        seconds = 0
    if seconds > 0:
        return [{"kind": "video", "min_seconds": seconds}]
    return [{"kind": "photo"}]


def _backfill(table_name: str) -> None:
    conn = op.get_bind()
    rows = conn.execute(
        sa.text(f"SELECT id, photo_required, min_video_seconds FROM {table_name}")
    ).fetchall()
    for row in rows:
        conn.execute(
            sa.text(
                f"UPDATE {table_name} SET completion_requirements = CAST(:reqs AS JSON) "
                "WHERE id = :id"
            ),
            {
                "reqs": json.dumps(_legacy_reqs(row.photo_required, row.min_video_seconds)),
                "id": row.id,
            },
        )


def upgrade() -> None:
    op.add_column("task_templates", sa.Column("completion_requirements", sa.JSON(), nullable=True))
    op.add_column("task_occurrences", sa.Column("completion_requirements", sa.JSON(), nullable=True))
    op.add_column("task_completions", sa.Column("completion_attachments", sa.JSON(), nullable=True))
    _backfill("task_templates")
    _backfill("task_occurrences")


def downgrade() -> None:
    op.drop_column("task_completions", "completion_attachments")
    op.drop_column("task_occurrences", "completion_requirements")
    op.drop_column("task_templates", "completion_requirements")
