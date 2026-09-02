"""a045 — retire la photo forcée par a034 si photo_required était faux."""

from typing import Sequence, Union
import json

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "a045_fix_stale_migrated_photo"
down_revision: Union[str, None] = "a044_chat_follow_up"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_TABLES = ("task_templates", "task_occurrences", "task_gallery_items")


def _columns(table: str) -> set[str]:
    return {col["name"] for col in inspect(op.get_bind()).get_columns(table)}


def _as_list(raw) -> list:
    if raw is None:
        return []
    if isinstance(raw, str):
        try:
            raw = json.loads(raw) if raw.strip() else []
        except json.JSONDecodeError:
            return []
    return raw if isinstance(raw, list) else []


def _is_stale_bare_photo(reqs, photo_required, min_video_seconds) -> bool:
    if photo_required:
        return False
    try:
        seconds = int(min_video_seconds) if min_video_seconds else 0
    except (TypeError, ValueError):
        seconds = 0
    if seconds > 0:
        return False
    if len(reqs) != 1 or not isinstance(reqs[0], dict):
        return False
    item = reqs[0]
    if item.get("kind") != "photo":
        return False
    return not any(str(item.get(key) or "").strip() for key in ("title", "hint", "example_url"))


def _fix_table(table_name: str) -> None:
    cols = _columns(table_name)
    if "completion_requirements" not in cols or "photo_required" not in cols:
        return
    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            f"SELECT id, photo_required, min_video_seconds, completion_requirements "
            f"FROM {table_name}"
        )
    ).fetchall()
    for row in rows:
        reqs = _as_list(row.completion_requirements)
        if not _is_stale_bare_photo(reqs, row.photo_required, row.min_video_seconds):
            continue
        conn.execute(
            sa.text(
                f"UPDATE {table_name} SET completion_requirements = CAST(:reqs AS JSON) "
                "WHERE id = :id"
            ),
            {"reqs": json.dumps([]), "id": row.id},
        )


def upgrade() -> None:
    for table in _TABLES:
        _fix_table(table)


def downgrade() -> None:
    return
