"""Intégration דוח נוכחות : pointage, pause, refus oved."""
from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

import app.db.session as db_session
from app.repositories.task_occurrence_repository import TaskOccurrenceRepository
from tests.integration.conftest import due_at_iso

TZ = ZoneInfo("Asia/Jerusalem")


def _seed_shift_task(world_seed: dict, *, title: str, is_work_start=False, is_work_end=False) -> str:
    assert db_session.SessionLocal is not None
    db = db_session.SessionLocal()
    try:
        occ = TaskOccurrenceRepository(db).create(
            template_id=None,
            branch_id=world_seed["branch_id"],
            title=title,
            description="",
            due_at=datetime.fromisoformat(due_at_iso()),
            assignee_user_id=world_seed["employee_id"],
            department_id=None,
            task_kind="fixed",
            manager_user_id=world_seed["manager_id"],
            created_by_id=world_seed["manager_id"],
            photo_required=False,
            is_work_start=is_work_start,
            is_work_end=is_work_end,
        )
        db.commit()
        return occ.id
    finally:
        db.close()


def _close_as_oved(client_emp, occ_id: str, jpeg_bytes: bytes) -> None:
    assert client_emp.post(f"/api/tasks/occurrences/{occ_id}/start").status_code == 200
    upload = client_emp.post(
        "/api/tasks/upload-photo",
        files={"file": ("punch.jpg", jpeg_bytes, "image/jpeg")},
    )
    assert upload.status_code == 200, upload.text
    done = client_emp.post(
        f"/api/tasks/occurrences/{occ_id}/complete",
        json={"status": "completed", "photo_path": upload.json()["url"]},
    )
    assert done.status_code == 200, done.text


def _employee_row(report: dict, employee_id: str) -> dict:
    return next(row for row in report["employees"] if row["user_id"] == employee_id)


def test_oved_cannot_open_attendance_report(client_emp, world_seed):
    denied = client_emp.get("/api/reports/attendance", params={"branch_id": world_seed["branch_id"]})
    assert denied.status_code == 403


def test_attendance_report_has_clock_times_and_break(
    client_mgr, client_emp, world_seed, jpeg_bytes
):
    start_id = _seed_shift_task(world_seed, title="פתיחת משמרת", is_work_start=True)
    end_id = _seed_shift_task(world_seed, title="סיום משמרת", is_work_end=True)
    _close_as_oved(client_emp, start_id, jpeg_bytes)
    started = client_emp.post("/api/employee-activity/break/start")
    assert started.status_code == 200, started.text
    assert started.json()["on_break"] is True
    ended = client_emp.post("/api/employee-activity/break/end")
    assert ended.status_code == 200, ended.text
    _close_as_oved(client_emp, end_id, jpeg_bytes)

    report = client_mgr.get(
        "/api/reports/attendance",
        params={"branch_id": world_seed["branch_id"], "period": "today"},
    )
    assert report.status_code == 200, report.text
    row = _employee_row(report.json(), world_seed["employee_id"])
    assert row["clock_in"]
    assert row["clock_out"]
    assert row["days_present"] >= 1
    assert all(item["code"] != "open_break" for item in row["anomalies"])


def test_open_break_is_an_attendance_anomaly(client_mgr, client_emp, world_seed, jpeg_bytes):
    start_id = _seed_shift_task(world_seed, title="פתיחה", is_work_start=True)
    _close_as_oved(client_emp, start_id, jpeg_bytes)
    assert client_emp.post("/api/employee-activity/break/start").status_code == 200

    report = client_mgr.get(
        "/api/reports/attendance",
        params={"branch_id": world_seed["branch_id"], "period": "today"},
    )
    assert report.status_code == 200, report.text
    row = _employee_row(report.json(), world_seed["employee_id"])
    assert any(item["code"] == "open_break" for item in row["anomalies"])
    assert report.json()["summary"]["alert_count"] >= 1
