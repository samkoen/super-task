from datetime import datetime, timedelta
from unittest.mock import MagicMock
from zoneinfo import ZoneInfo

import pytest

from app.domain import roles, task_status
from app.domain.scope import ActorContext
from app.models.task_occurrence import TaskOccurrence
from app.services.task_occurrence_service import TaskOccurrenceService

TZ = ZoneInfo("Asia/Jerusalem")


def _occurrence(**overrides) -> TaskOccurrence:
    base = {
        "id": "occ-1",
        "template_id": None,
        "branch_id": "b1",
        "title": "T",
        "description": "",
        "due_at": "2026-08-29T09:00:00+03:00",
        "status": task_status.AWAITING_RESPONSE,
        "assignee_user_id": "e1",
        "department_id": None,
        "task_kind": "ad_hoc",
        "manager_user_id": "m1",
        "photo_required": False,
        "reference_photo_url": None,
        "reference_video_url": None,
        "reference_audio_url": None,
        "media_purge_after": None,
        "started_at": None,
        "started_by_id": None,
        "created_by_id": "m1",
        "created_at": "2026-08-29T00:00:00+03:00",
        "updated_at": "2026-08-29T00:00:00+03:00",
    }
    base.update(overrides)
    return TaskOccurrence(**base)


def _svc(repo) -> TaskOccurrenceService:
    svc = TaskOccurrenceService(repo, MagicMock(), MagicMock(), MagicMock())
    svc._to_api = lambda occ, **k: occ.to_dict()
    return svc


def test_manager_resolves_open_chat_without_reading():
    repo = MagicMock()
    repo.find_by_id.return_value = _occurrence()
    repo.resolve_chat_task.return_value = _occurrence(
        status=task_status.IN_PROGRESS, chat_resolved_at=datetime.now(TZ).isoformat()
    )
    actor = ActorContext(user_id="m1", role=roles.BRANCH_MANAGER, network_id="n1", branch_id="b1")
    result = _svc(repo).resolve_chat_task(actor, "occ-1")
    repo.resolve_chat_task.assert_called_once()
    assert result["status"] == task_status.IN_PROGRESS
    assert result["chat_resolved_at"]


def test_employee_cannot_resolve_chat_task():
    repo = MagicMock()
    repo.find_by_id.return_value = _occurrence()
    actor = ActorContext(user_id="e1", role=roles.EMPLOYEE, network_id="n1", branch_id="b1")
    with pytest.raises(PermissionError):
        _svc(repo).resolve_chat_task(actor, "occ-1")


def test_manager_sets_future_follow_up():
    repo = MagicMock()
    repo.find_by_id.return_value = _occurrence()
    later = (datetime.now(TZ) + timedelta(days=1)).isoformat()
    repo.set_chat_follow_up.return_value = _occurrence(chat_follow_up_at=later)
    actor = ActorContext(user_id="m1", role=roles.BRANCH_MANAGER, network_id="n1", branch_id="b1")
    result = _svc(repo).set_chat_follow_up(actor, "occ-1", follow_up_at=later)
    repo.set_chat_follow_up.assert_called_once()
    assert result["chat_follow_up_at"] == later


def test_follow_up_rejected_when_not_open_chat():
    repo = MagicMock()
    repo.find_by_id.return_value = _occurrence(status=task_status.IN_PROGRESS)
    actor = ActorContext(user_id="m1", role=roles.BRANCH_MANAGER, network_id="n1", branch_id="b1")
    with pytest.raises(ValueError, match="פתוחה"):
        _svc(repo).set_chat_follow_up(actor, "occ-1", follow_up_at="2026-09-01T10:00:00+03:00")
