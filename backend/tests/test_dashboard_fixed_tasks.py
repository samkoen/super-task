"""Dashboard : קבועות du jour (génération, pas de report d'hier)."""
from __future__ import annotations

from datetime import date, datetime
from unittest.mock import MagicMock
from zoneinfo import ZoneInfo

from app.domain import task_status
from app.models.task_occurrence import TaskOccurrence
from app.services.dashboard_service import DashboardService

TZ = ZoneInfo("Asia/Jerusalem")
DAY = date(2026, 8, 19)
NOW = datetime(2026, 8, 19, 12, 0, tzinfo=TZ)


def _occ(id_: str, **over) -> TaskOccurrence:
    base = dict(
        id=id_,
        template_id="tpl-1",
        branch_id="b1",
        title="קבועה",
        description="",
        due_at="2026-08-19T23:59:00+03:00",
        status=task_status.PENDING,
        assignee_user_id="e1",
        department_id=None,
        task_kind="fixed",
        manager_user_id=None,
        photo_required=False,
        reference_photo_url=None,
        reference_video_url=None,
        reference_audio_url=None,
        media_purge_after=None,
        started_at=None,
        started_by_id=None,
        created_by_id="m1",
        created_at="2026-08-19T08:00:00+03:00",
        updated_at="2026-08-19T08:00:00+03:00",
    )
    base.update(over)
    return TaskOccurrence(**base)


def _service(occ, scheduler=None) -> DashboardService:
    return DashboardService(
        occ,
        MagicMock(),
        MagicMock(),
        MagicMock(),
        MagicMock(),
        scheduler=scheduler,
    )


def test_sync_live_occurrences_runs_scheduler():
    occ = MagicMock()
    scheduler = MagicMock()
    _service(occ, scheduler)._sync_live_occurrences(NOW)
    scheduler.run_for_date.assert_called_once_with(DAY)
    occ.rollover_open_tasks_to_day.assert_not_called()


def test_sync_live_occurrences_without_scheduler_rollovers():
    occ = MagicMock()
    occ.expire_open_fixed_before.return_value = []
    _service(occ)._sync_live_occurrences(NOW)
    occ.expire_open_fixed_before.assert_called_once()
    occ.rollover_open_tasks_to_day.assert_called_once()
    occ.mark_overdue_before.assert_called_once()


def test_tasks_for_dashboard_day_only_due_today():
    occ = MagicMock()
    today = _occ("today")
    occ.list_occurrences.return_value = [today]
    result = _service(occ)._tasks_for_dashboard_day(branch_id="b1", day=DAY, now=NOW)
    assert [t.id for t in result] == ["today"]
    occ.expire_open_fixed_before.assert_not_called()
