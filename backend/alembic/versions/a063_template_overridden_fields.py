"""a063 — champs adaptés par snif + regroupement des anciennes tâches réseau."""

import json
import uuid
from collections import Counter, defaultdict
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a063_template_overrides"
down_revision: Union[str, None] = "a062_media_retention_days"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_TABLE = sa.table(
    "task_templates",
    sa.column("id", sa.Uuid()),
    sa.column("branch_id", sa.Uuid()),
    sa.column("title", sa.String()),
    sa.column("description", sa.String()),
    sa.column("recurrence", sa.String()),
    sa.column("due_time", sa.String()),
    sa.column("weekly_days", sa.String()),
    sa.column("monthly_day", sa.Integer()),
    sa.column("task_kind", sa.String()),
    sa.column("network_group_id", sa.Uuid()),
    sa.column("created_at", sa.DateTime()),
    sa.column("is_active", sa.Boolean()),
    sa.column("start_url", sa.String()),
    sa.column("reference_photo_url", sa.String()),
    sa.column("reference_video_url", sa.String()),
    sa.column("reference_audio_url", sa.String()),
    sa.column("completion_requirements", sa.JSON()),
    sa.column("photo_required", sa.Boolean()),
    sa.column("min_video_seconds", sa.Integer()),
    sa.column("overridden_fields", sa.JSON()),
)

# Champs que le regroupement ne compare pas déjà : si deux copies diffèrent là-dessus,
# c'est qu'un snif avait été réglé à part avant la refonte -> on le marque « adapté ».
_FIELD_COLUMNS: dict[str, tuple[str, ...]] = {
    "is_active": ("is_active",),
    "reference_media": ("reference_photo_url", "reference_video_url", "reference_audio_url"),
    "start_url": ("start_url",),
    "completion_requirements": ("completion_requirements", "photo_required", "min_video_seconds"),
}


def _content_key(row) -> tuple:
    return (
        (row.title or "").strip(),
        (row.description or "").strip(),
        row.recurrence,
        row.due_time,
        row.weekly_days or "",
        row.monthly_day,
    )


def _norm(value):
    if isinstance(value, str):
        return value.strip() or None
    return None if value == [] else value


def _value(row, field: str) -> str:
    parts = tuple(_norm(getattr(row, col, None)) for col in _FIELD_COLUMNS[field])
    return json.dumps(parts, sort_keys=True, default=str)


def _seed_overrides(members: list) -> dict:
    """id -> champs où la copie s'écarte de la valeur la plus courante du groupe."""
    ordered = sorted(members, key=lambda m: (str(m.created_at or ""), str(m.id)))
    seeded: dict = {m.id: [] for m in ordered}
    for field in _FIELD_COLUMNS:
        values = [_value(m, field) for m in ordered]
        counts = Counter(values)
        common = next(v for v in values if counts[v] == max(counts.values()))
        for member, value in zip(ordered, values):
            if value != common:
                seeded[member.id].append(field)
    return seeded


def _group_legacy_templates(bind) -> None:
    rows = bind.execute(
        sa.select(_TABLE).where(
            _TABLE.c.task_kind == "fixed", _TABLE.c.network_group_id.is_(None)
        )
    ).fetchall()
    buckets: dict[tuple, list] = defaultdict(list)
    for row in rows:
        buckets[_content_key(row)].append(row)
    for members in buckets.values():
        branches = [m.branch_id for m in members]
        # Un seul exemplaire par snif, au moins 2 snifim : sinon ce n'est pas une copie réseau.
        if len(set(branches)) < 2 or len(set(branches)) != len(branches):
            continue
        group_id = uuid.uuid4()
        for template_id, fields in _seed_overrides(members).items():
            bind.execute(
                _TABLE.update()
                .where(_TABLE.c.id == template_id)
                .values(network_group_id=group_id, overridden_fields=fields or None)
            )


def upgrade() -> None:
    op.add_column("task_templates", sa.Column("overridden_fields", sa.JSON(), nullable=True))
    _group_legacy_templates(op.get_bind())


def downgrade() -> None:
    op.drop_column("task_templates", "overridden_fields")
