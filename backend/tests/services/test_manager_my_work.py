from datetime import date, datetime
from types import SimpleNamespace
from unittest.mock import MagicMock
from zoneinfo import ZoneInfo

from app.domain import roles, task_status
from app.domain.scope import ActorContext
from app.models.task_occurrence import TaskOccurrence
from app.services.dashboard_service import DashboardService

TZ = ZoneInfo("Asia/Jerusalem")
NOW = datetime(2026, 9, 19, 12, 0, tzinfo=TZ)
DAY = date(2026, 9, 19)


def _task(**kwargs) -> TaskOccurrence:
    defaults = {
        "id": "t1",
        "template_id": None,
        "branch_id": "b1",
        "title": "דוח",
        "description": "",
        "due_at": "2026-09-19T18:00:00+03:00",
        "status": task_status.PENDING,
        "assignee_user_id": "m1",
        "department_id": None,
        "task_kind": "ad_hoc",
        "manager_user_id": None,
        "photo_required": False,
        "reference_photo_url": None,
        "reference_video_url": None,
        "reference_audio_url": None,
        "media_purge_after": None,
        "started_at": None,
        "started_by_id": None,
        "created_by_id": None,
        "created_at": "2026-09-19T08:00:00+03:00",
        "updated_at": "2026-09-19T08:00:00+03:00",
    }
    defaults.update(kwargs)
    return TaskOccurrence(**defaults)


def _svc() -> DashboardService:
    occ = MagicMock()
    occ.list_occurrences.return_value = []
    occ.get_department_name.return_value = None
    occ.get_assignee_name.return_value = None
    completions = MagicMock()
    completions.find_by_occurrence.return_value = None
    completions.find_by_occurrence_ids.return_value = {}
    completions.list_quality_ratings_by_assignee.return_value = []
    return DashboardService(occ, MagicMock(), MagicMock(), MagicMock(), completions)


def test_my_work_lists_tasks_assigned_to_menahel():
    svc = _svc()
    svc._occurrences.list_occurrences.return_value = [_task()]
    actor = ActorContext(
        user_id="m1", role=roles.BRANCH_MANAGER, network_id="n1", branch_id="b1"
    )
    payload = svc._my_work_payload(actor, DAY, NOW)
    assert [t["id"] for t in payload["urgent_tasks"]] == ["t1"]
    assert payload["progress_percent"] == 0


def test_attach_action_queues_skips_own_tasks():
    svc = _svc()
    payload: dict = {}
    svc._attach_action_queues(
        payload,
        [
            _task(id="mine", assignee_user_id="m1", status=task_status.PENDING_REVIEW),
            _task(id="oved", assignee_user_id="e1", status=task_status.PENDING_REVIEW),
        ],
        "m1",
        NOW,
    )
    ids = [item["id"] for item in payload["task_queues"]["pending_review"]]
    assert ids == ["oved"]
