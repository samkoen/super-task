"""Le tableau oved liste les tâches où le menahel attend encore."""
import asyncio
from unittest.mock import MagicMock

from app.domain import task_status
from app.domain.scope import ActorContext
from app.models.task_message import TaskMessage
from app.models.task_occurrence import TaskOccurrence
from app.services.dashboard_service import DashboardService


def _occurrence(**kwargs) -> TaskOccurrence:
    defaults = {
        "id": "occ-1",
        "template_id": None,
        "branch_id": "b1",
        "title": "ניקוי",
        "description": "",
        "due_at": "2026-09-23T18:00:00+03:00",
        "status": task_status.IN_PROGRESS,
        "assignee_user_id": "e1",
        "department_id": None,
        "task_kind": "fixed",
        "manager_user_id": None,
        "photo_required": False,
        "reference_photo_url": None,
        "reference_video_url": None,
        "reference_audio_url": None,
        "media_purge_after": None,
        "started_at": "2026-09-23T09:00:00+03:00",
        "started_by_id": "e1",
        "created_by_id": None,
        "created_at": "2026-09-23T08:00:00+03:00",
        "updated_at": "2026-09-23T09:00:00+03:00",
    }
    defaults.update(kwargs)
    return TaskOccurrence(**defaults)


def _message(**kwargs) -> TaskMessage:
    defaults = {
        "id": "m1",
        "occurrence_id": "occ-1",
        "sender_user_id": "m1",
        "body": "תסתכל בתמונה",
        "photo_url": None,
        "video_url": None,
        "audio_url": None,
        "created_at": "2026-09-23T10:00:00+03:00",
    }
    defaults.update(kwargs)
    return TaskMessage(**defaults)


def _service(tasks, messages) -> DashboardService:
    occ = MagicMock()
    occ.list_occurrences.return_value = tasks
    occ.get_branch_name.return_value = "סניף"
    occ.get_department_name.return_value = None
    users = MagicMock()
    users.find_by_id.return_value = MagicMock(
        full_name="עובד",
        job_function=None,
        preferred_language="he",
        avatar_url=None,
        excellence_slogan=None,
    )
    completions = MagicMock()
    completions.find_by_occurrence.return_value = None
    completions.list_quality_ratings_by_assignee.return_value = []
    return DashboardService(
        occ,
        MagicMock(),
        MagicMock(),
        users,
        completions,
        message_repo=messages,
    )


def test_dashboard_includes_manager_waiting_preview():
    messages = MagicMock()
    messages.last_messages_for.return_value = {"occ-1": _message()}
    actor = ActorContext(user_id="e1", role="employee", network_id="n1", branch_id="b1")
    data = asyncio.run(_service([_occurrence()], messages).employee_dashboard(actor))
    waiting = data["manager_waiting_tasks"]
    assert [card["id"] for card in waiting] == ["occ-1"]
    assert waiting[0]["manager_message_preview"] == "תסתכל בתמונה"


def test_dashboard_omits_waiting_after_employee_reply():
    messages = MagicMock()
    messages.last_messages_for.return_value = {
        "occ-1": _message(sender_user_id="e1", body="הבנתי"),
    }
    actor = ActorContext(user_id="e1", role="employee", network_id="n1", branch_id="b1")
    data = asyncio.run(
        _service([_occurrence(status=task_status.AWAITING_RESPONSE)], messages).employee_dashboard(actor)
    )
    assert data["manager_waiting_tasks"] == []


def test_dashboard_waiting_is_empty_without_message_repo():
    actor = ActorContext(user_id="e1", role="employee", network_id="n1", branch_id="b1")
    data = asyncio.run(_service([_occurrence()], None).employee_dashboard(actor))
    assert data["manager_waiting_tasks"] == []
