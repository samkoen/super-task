from unittest.mock import MagicMock

from app.domain.employee_inactivity import IDLE_MINUTES
from app.main import _start_background_loops
from app.services.employee_inactivity_loop import (
    SCAN_INTERVAL_S,
    run_inactivity_scan_once,
)


def test_scan_interval_is_at_most_idle_threshold():
    assert 0 < SCAN_INTERVAL_S <= IDLE_MINUTES * 60


def test_background_loops_disabled_during_pytest():
    assert _start_background_loops() == []


def test_run_inactivity_scan_once_skips_without_database(monkeypatch):
    monkeypatch.setattr(
        "app.services.employee_inactivity_loop.db_session.SessionLocal", None
    )
    run_inactivity_scan_once()


def test_run_inactivity_scan_once_commits_and_pushes_sse(monkeypatch):
    db = MagicMock()
    activity = MagicMock()
    activity.run_inactivity_scan.return_value = {
        "checked": 2,
        "notified": 1,
        "pending": [("n1",)],
    }
    sse: list = []
    monkeypatch.setattr(
        "app.services.employee_inactivity_loop.db_session.SessionLocal",
        lambda: db,
    )
    monkeypatch.setattr(
        "app.services.employee_inactivity_loop.bind_employee_activity",
        lambda _db: activity,
    )
    monkeypatch.setattr(
        "app.services.employee_inactivity_loop.NotificationService.push_task_event_sse",
        sse.append,
    )

    run_inactivity_scan_once()

    db.commit.assert_called_once()
    assert sse == [[("n1",)]]
    db.close.assert_called_once()


def test_run_inactivity_scan_once_rolls_back_on_error(monkeypatch):
    db = MagicMock()
    activity = MagicMock()
    activity.run_inactivity_scan.side_effect = RuntimeError("scan failed")
    monkeypatch.setattr(
        "app.services.employee_inactivity_loop.db_session.SessionLocal",
        lambda: db,
    )
    monkeypatch.setattr(
        "app.services.employee_inactivity_loop.bind_employee_activity",
        lambda _db: activity,
    )

    run_inactivity_scan_once()

    db.rollback.assert_called_once()
    db.commit.assert_not_called()
    db.close.assert_called_once()
