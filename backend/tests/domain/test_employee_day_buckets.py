from datetime import datetime
from types import SimpleNamespace
from zoneinfo import ZoneInfo

from app.domain import task_status
from app.domain.employee_day_buckets import split_employee_day_tasks

TZ = ZoneInfo("Asia/Jerusalem")
NOW = datetime(2026, 9, 19, 12, 0, tzinfo=TZ)


def _task(**kwargs):
    defaults = {
        "id": "t1",
        "status": task_status.PENDING,
        "task_kind": "fixed",
        "due_at": "2026-09-19T18:00:00+03:00",
        "manager_next_at": None,
    }
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


def test_splits_in_progress_and_completed():
    buckets = split_employee_day_tasks(
        [
            _task(id="a", status=task_status.IN_PROGRESS, due_at="2026-09-19T10:00:00+03:00"),
            _task(id="b", status=task_status.COMPLETED, due_at="2026-09-19T09:00:00+03:00"),
        ],
        now=NOW,
        tz=TZ,
    )
    assert [t.id for t in buckets.in_progress] == ["a"]
    assert [t.id for t in buckets.completed] == ["b"]
    assert buckets.today_open == []
    assert buckets.urgent == []


def test_ad_hoc_and_overdue_are_urgent():
    buckets = split_employee_day_tasks(
        [
            _task(id="u", task_kind="ad_hoc", due_at="2026-09-19T18:00:00+03:00"),
            _task(id="o", status=task_status.OVERDUE, due_at="2026-09-19T08:00:00+03:00"),
            _task(id="later", due_at="2026-09-19T18:00:00+03:00"),
        ],
        now=NOW,
        tz=TZ,
    )
    assert {t.id for t in buckets.urgent} == {"u", "o"}
    assert [t.id for t in buckets.today_open] == ["later"]


def test_awaiting_response_is_not_in_open_lists():
    buckets = split_employee_day_tasks(
        [_task(id="q", status=task_status.AWAITING_RESPONSE)],
        now=NOW,
        tz=TZ,
    )
    assert [t.id for t in buckets.awaiting_response] == ["q"]
    assert buckets.urgent == []
    assert buckets.today_open == []
