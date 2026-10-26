"""a063 : les anciennes copies réseau (même contenu, snifim différents) reçoivent un group id."""
import importlib.util
import uuid
from pathlib import Path

import sqlalchemy as sa

from app.db.models import Base, TaskTemplate

_PATH = Path(__file__).resolve().parents[1] / "alembic" / "versions" / "a063_template_overridden_fields.py"
_SPEC = importlib.util.spec_from_file_location("a063", _PATH)
_MIG = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(_MIG)


def _engine():
    engine = sa.create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine, tables=[TaskTemplate.__table__])
    return engine


def _row(branch_id, title="בדיקה", due_time="09:00", group=None, **extra) -> dict:
    row = dict(
        id=uuid.uuid4(), branch_id=branch_id, title=title, description="", recurrence="daily",
        due_time=due_time, weekly_days=None, monthly_day=None, task_kind="fixed",
        network_group_id=group, photo_required=False, is_work_start=False, is_work_end=False,
        is_active=True, opened_by_delivery_note=False, created_by_id=uuid.uuid4(),
    )
    row.update(extra)
    return row


def _groups(conn) -> dict:
    rows = conn.execute(sa.select(TaskTemplate.__table__)).fetchall()
    return {r.id: r.network_group_id for r in rows}


def _overrides(conn) -> dict:
    rows = conn.execute(sa.select(TaskTemplate.__table__)).fetchall()
    return {r.id: r.overridden_fields for r in rows}


def _migrate(rows: list[dict]) -> dict:
    engine = _engine()
    with engine.begin() as conn:
        conn.execute(TaskTemplate.__table__.insert(), rows)
        _MIG._group_legacy_templates(conn)
        return _overrides(conn)


def test_same_content_on_two_branches_is_grouped():
    engine = _engine()
    a, b = _row(uuid.uuid4()), _row(uuid.uuid4())
    with engine.begin() as conn:
        conn.execute(TaskTemplate.__table__.insert(), [a, b])
        _MIG._group_legacy_templates(conn)
        groups = _groups(conn)
    assert groups[a["id"]] is not None
    assert groups[a["id"]] == groups[b["id"]]


def test_single_branch_or_duplicate_in_same_branch_is_left_alone():
    engine = _engine()
    branch = uuid.uuid4()
    solo = _row(uuid.uuid4(), title="לבד")
    twin1, twin2 = _row(branch, title="כפול"), _row(branch, title="כפול")
    with engine.begin() as conn:
        conn.execute(TaskTemplate.__table__.insert(), [solo, twin1, twin2])
        _MIG._group_legacy_templates(conn)
        groups = _groups(conn)
    assert set(groups.values()) == {None}


def test_existing_group_is_not_overwritten():
    engine = _engine()
    existing = uuid.uuid4()
    a, b = _row(uuid.uuid4(), group=existing), _row(uuid.uuid4(), group=existing)
    with engine.begin() as conn:
        conn.execute(TaskTemplate.__table__.insert(), [a, b])
        _MIG._group_legacy_templates(conn)
        groups = _groups(conn)
    assert set(groups.values()) == {existing}


def test_identical_copies_start_with_no_adaptation():
    a, b = _row(uuid.uuid4()), _row(uuid.uuid4())
    assert set(_migrate([a, b]).values()) == {None}


def test_a_copy_paused_before_the_refactor_is_marked_adapted():
    rows = [_row(uuid.uuid4()), _row(uuid.uuid4()), _row(uuid.uuid4(), is_active=False)]
    result = _migrate(rows)
    assert result[rows[2]["id"]] == ["is_active"]
    assert result[rows[0]["id"]] is None and result[rows[1]["id"]] is None


def test_a_copy_with_its_own_link_and_proof_is_marked_adapted():
    rows = [
        _row(uuid.uuid4(), start_url="https://a.example"),
        _row(uuid.uuid4(), start_url="https://a.example"),
        _row(uuid.uuid4(), start_url="https://b.example", completion_requirements=[{"kind": "photo"}], photo_required=True),
    ]
    result = _migrate(rows)
    assert result[rows[2]["id"]] == ["start_url", "completion_requirements"]
    assert result[rows[0]["id"]] is None


def test_empty_values_do_not_count_as_a_difference():
    rows = [
        _row(uuid.uuid4(), start_url="", completion_requirements=[]),
        _row(uuid.uuid4(), start_url=None, completion_requirements=None),
    ]
    assert set(_migrate(rows).values()) == {None}
