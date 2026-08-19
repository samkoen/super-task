"""Tests domain דוחות עובדים."""
from datetime import date
from zoneinfo import ZoneInfo

from app.domain import task_status
from app.domain.employee_work_report import (
    aggregate_employee_reports,
    build_employee_report_row,
    report_summary,
    resolve_report_range,
)
from app.domain.fixed_task_expiry import SYSTEM_NOT_COMPLETED_REASON
from app.models.task_completion import TaskCompletion
from app.models.task_occurrence import TaskOccurrence
from app.models.user import User

TZ = ZoneInfo("Asia/Jerusalem")


def _emp(uid: str = "e1", name: str = "עובד") -> User:
    first, _, last = name.partition(" ")
    return User(
        id=uid,
        email=f"{uid}@t.com",
        first_name=first or name,
        last_name=last or "טסט",
        role="employee",
        branch_id="b1",
        network_id="n1",
        is_active=True,
        email_verified=True,
    )


def _occ(**kw) -> TaskOccurrence:
    base = dict(
        id="o1",
        template_id=None,
        branch_id="b1",
        title="T",
        description="",
        due_at="2026-08-17T12:00:00+03:00",
        status=task_status.PENDING,
        assignee_user_id="e1",
        department_id=None,
        task_kind="ad_hoc",
        manager_user_id=None,
        photo_required=False,
        reference_photo_url=None,
        reference_video_url=None,
        reference_audio_url=None,
        media_purge_after=None,
        started_at=None,
        started_by_id=None,
        created_by_id="m1",
        created_at="2026-08-17T00:00:00+03:00",
        updated_at="2026-08-17T00:00:00+03:00",
    )
    base.update(kw)
    return TaskOccurrence(**base)


def test_resolve_report_range():
    today = date(2026, 8, 17)
    assert resolve_report_range("today", today=today) == (today, today)
    assert resolve_report_range("7d", today=today) == (date(2026, 8, 11), today)
    assert resolve_report_range("30d", today=today)[0] == date(2026, 7, 19)


def test_build_row_counts_and_avg_duration():
    emp = _emp()
    tasks = [
        _occ(id="a", status=task_status.COMPLETED, started_at="2026-08-17T10:00:00+03:00"),
        _occ(id="b", status=task_status.OVERDUE),
        _occ(id="c", status=task_status.CANCELLED),
    ]
    completions = {
        "a": TaskCompletion(
            id="c1",
            occurrence_id="a",
            status="done",
            note=None,
            photo_path=None,
            video_path=None,
            audio_path=None,
            not_completed_reason=None,
            completed_by_id="e1",
            completed_at="2026-08-17T10:30:00+03:00",
        )
    }
    row = build_employee_report_row(
        emp, tasks, completions, tz=TZ, branch_names={"b1": "מרכז"}
    )
    assert row["assigned_count"] == 2
    assert row["completed_count"] == 1
    assert row["overdue_count"] == 1
    assert row["completion_pct"] == 0.5
    assert row["avg_completion_minutes"] == 30
    assert row["last_activity_at"] == "2026-08-17T10:30:00+03:00"
    assert row["branch_id"] == "b1"
    assert row["branch_name"] == "מרכז"


def test_auto_closed_fixed_counts_as_assigned_not_completed():
    emp = _emp()
    tasks = [
        _occ(id="a", status=task_status.COMPLETED),
        _occ(id="b", status=task_status.CANCELLED, task_kind="fixed"),
    ]
    completions = {
        "b": TaskCompletion(
            id="c2",
            occurrence_id="b",
            status=task_status.COMPLETION_NOT_DONE,
            note=None,
            photo_path=None,
            video_path=None,
            audio_path=None,
            not_completed_reason=SYSTEM_NOT_COMPLETED_REASON,
            completed_by_id="e1",
            completed_at="2026-08-18T00:01:00+03:00",
        )
    }
    row = build_employee_report_row(emp, tasks, completions, tz=TZ)
    assert row["assigned_count"] == 2
    assert row["completed_count"] == 1
    assert row["completion_pct"] == 0.5
    assert row["overdue_count"] == 0


def test_aggregate_sorts_weak_first():
    e1 = _emp("e1", "אלון")
    e2 = _emp("e2", "בנצי")
    tasks = [
        _occ(id="1", assignee_user_id="e1", status=task_status.COMPLETED),
        _occ(id="2", assignee_user_id="e2", status=task_status.OVERDUE),
    ]
    rows = aggregate_employee_reports([e1, e2], tasks, {}, tz=TZ)
    assert rows[0]["user_id"] == "e2"
    assert rows[1]["user_id"] == "e1"


def test_alert_breakdown_exclusive_slices():
    from app.domain.employee_work_report import alert_breakdown

    rows = [
        {"assigned_count": 2, "completion_pct": 0.8, "overdue_count": 0},
        {"assigned_count": 2, "completion_pct": 0.2, "overdue_count": 0},
        {"assigned_count": 1, "completion_pct": 0.0, "overdue_count": 1},
        {"assigned_count": 0, "completion_pct": 1.0, "overdue_count": 0},
    ]
    slices = {s["key"]: s["count"] for s in alert_breakdown(rows)}
    assert slices == {"ok": 1, "weak_pct": 1, "overdue": 1, "no_tasks": 1}


def test_daily_and_branch_charts():
    from app.domain.employee_work_report import build_report_charts

    tasks = [
        _occ(id="1", branch_id="b1", status=task_status.COMPLETED, due_at="2026-08-16T12:00:00+03:00"),
        _occ(id="2", branch_id="b2", status=task_status.OVERDUE, due_at="2026-08-17T12:00:00+03:00"),
        _occ(id="3", branch_id="b1", status=task_status.PENDING, due_at="2026-08-17T15:00:00+03:00"),
    ]
    charts = build_report_charts(
        [],
        tasks,
        due_from=date(2026, 8, 16),
        due_to=date(2026, 8, 17),
        tz=TZ,
        branch_names={"b1": "א", "b2": "ב"},
    )
    assert len(charts["daily_series"]) == 2
    assert charts["daily_series"][0]["completion_pct"] == 1.0
    assert charts["daily_series"][1]["completion_pct"] == 0.0
    by_name = {r["branch_name"]: r for r in charts["by_branch"]}
    assert by_name["ב"]["overdue_count"] == 1
    assert by_name["א"]["assigned_count"] == 2


def test_report_summary_alerts():
    rows = [
        {
            "assigned_count": 2,
            "completed_count": 0,
            "completion_pct": 0.0,
            "overdue_count": 1,
        },
        {
            "assigned_count": 2,
            "completed_count": 2,
            "completion_pct": 1.0,
            "overdue_count": 0,
        },
    ]
    summary = report_summary(rows)
    assert summary["employees_count"] == 2
    assert summary["total_completed"] == 2
    assert summary["avg_completion_pct"] == 0.5
    assert summary["alert_count"] == 1
