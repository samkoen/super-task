"""a063 — champs adaptés par snif + regroupement des anciennes tâches réseau."""

import uuid
from collections import defaultdict
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
)


def _content_key(row) -> tuple:
    return (
        (row.title or "").strip(),
        (row.description or "").strip(),
        row.recurrence,
        row.due_time,
        row.weekly_days or "",
        row.monthly_day,
    )


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
        ids = [m.id for m in members]
        bind.execute(
            _TABLE.update().where(_TABLE.c.id.in_(ids)).values(network_group_id=group_id)
        )


def upgrade() -> None:
    op.add_column("task_templates", sa.Column("overridden_fields", sa.JSON(), nullable=True))
    _group_legacy_templates(op.get_bind())


def downgrade() -> None:
    op.drop_column("task_templates", "overridden_fields")
