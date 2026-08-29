"""Tests דוח נוכחות — heures, pauses, anomalies."""
from datetime import date
from types import SimpleNamespace
from zoneinfo import ZoneInfo

from app.domain import task_status
from app.domain.attendance import (
    INVERTED,
    MISSING_CLOCK_IN,
    MISSING_CLOCK_OUT,
    OPEN_BREAK,
    OVERLAP,
    aggregate_employee_attendance,
    attendance_summary,
    build_day_row,
    clock_out_at,
    overtime_minutes,
    worked_minutes,
)
from app.domain.work_start import normalize_work_flags
from app.models.user import User

TZ = ZoneInfo("Asia/Jerusalem")


def _task(**kw):
    base = dict(
        id="t1",
        is_work_start=False,
        is_work_end=False,
        status=task_status.PENDING,
        started_at=None,
    )
    base.update(kw)
    return SimpleNamespace(**base)


def _completion(occ_id: str, completed_at: str):
    return SimpleNamespace(occurrence_id=occ_id, completed_at=completed_at)


def test_normalize_work_flags_rejects_both():
    try:
        normalize_work_flags(True, True)
        assert False, "expected ValueError"
    except ValueError:
        pass


def test_clock_out_uses_closed_work_end_completion():
    tasks = [
        _task(id="end", is_work_end=True, status=task_status.COMPLETED),
        _task(id="other", status=task_status.COMPLETED),
    ]
    completions = {
        "end": _completion("end", "2026-08-18T16:10:00+03:00"),
        "other": _completion("other", "2026-08-18T12:00:00+03:00"),
    }
    assert clock_out_at(tasks, completions) == "2026-08-18T16:10:00+03:00"


def test_clock_out_none_until_work_end_closed():
    tasks = [_task(id="end", is_work_end=True, status=task_status.IN_PROGRESS)]
    completions = {"end": _completion("end", "2026-08-18T16:10:00+03:00")}
    assert clock_out_at(tasks, completions) is None


def test_worked_minutes_subtracts_breaks():
    worked = worked_minutes(
        "2026-08-18T08:00:00+03:00",
        "2026-08-18T17:00:00+03:00",
        60,
        tz=TZ,
    )
    assert worked == 8 * 60


def test_overtime_after_eight_hours():
    assert overtime_minutes(9 * 60) == 60
    assert overtime_minutes(None) == 0
    assert overtime_minutes(7 * 60) == 0


def test_missing_clock_in_when_activity_without_punch():
    tasks = [_task(started_at="2026-08-18T09:00:00+03:00", status=task_status.IN_PROGRESS)]
    row = build_day_row(
        day=date(2026, 8, 18),
        tasks=tasks,
        completions={},
        breaks=[],
        idle_count=0,
        day_is_past=True,
        prev_unclosed=False,
        tz=TZ,
    )
    assert MISSING_CLOCK_IN in row["anomalies"]
    assert MISSING_CLOCK_OUT not in row["anomalies"]


def test_missing_clock_out_on_past_day():
    tasks = [
        _task(
            is_work_start=True,
            status=task_status.COMPLETED,
            started_at="2026-08-18T08:00:00+03:00",
        )
    ]
    row = build_day_row(
        day=date(2026, 8, 18),
        tasks=tasks,
        completions={},
        breaks=[],
        idle_count=0,
        day_is_past=True,
        prev_unclosed=False,
        tz=TZ,
    )
    assert row["clock_in"] == "2026-08-18T08:00:00+03:00"
    assert MISSING_CLOCK_OUT in row["anomalies"]


def test_today_without_clock_out_is_not_missing():
    tasks = [
        _task(
            is_work_start=True,
            status=task_status.COMPLETED,
            started_at="2026-08-18T08:00:00+03:00",
        )
    ]
    row = build_day_row(
        day=date(2026, 8, 18),
        tasks=tasks,
        completions={},
        breaks=[],
        idle_count=0,
        day_is_past=False,
        prev_unclosed=False,
        tz=TZ,
    )
    assert MISSING_CLOCK_OUT not in row["anomalies"]


def test_inverted_and_overlap_and_open_break():
    tasks = [
        _task(
            id="in",
            is_work_start=True,
            status=task_status.COMPLETED,
            started_at="2026-08-18T16:00:00+03:00",
        ),
        _task(id="out", is_work_end=True, status=task_status.COMPLETED),
    ]
    completions = {"out": _completion("out", "2026-08-18T08:00:00+03:00")}
    breaks = [
        SimpleNamespace(
            started_at="2026-08-18T12:00:00+03:00",
            ended_at=None,
        )
    ]
    row = build_day_row(
        day=date(2026, 8, 18),
        tasks=tasks,
        completions=completions,
        breaks=breaks,
        idle_count=1,
        day_is_past=True,
        prev_unclosed=True,
        tz=TZ,
    )
    assert INVERTED in row["anomalies"]
    assert OVERLAP in row["anomalies"]
    assert OPEN_BREAK in row["anomalies"]


def test_empty_employee_has_no_alerts():
    emp = User(
        id="u1",
        email="a@b.c",
        first_name="א",
        last_name="ב",
        branch_id="b1",
    )
    row = aggregate_employee_attendance(emp, [], branch_names={"b1": "סניף"})
    summary = attendance_summary([row])
    assert row["worked_minutes"] == 0
    assert row["anomalies"] == []
    assert summary["alert_count"] == 0
    assert summary["employees_count"] == 1
