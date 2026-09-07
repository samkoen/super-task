"""Service — liste שיחות oved."""
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from app.domain import roles, task_status
from app.domain.scope import ActorContext
from app.services.task_message_service import TaskMessageService


def _svc(message_repo):
    return TaskMessageService(message_repo, MagicMock(), MagicMock(), MagicMock())


def test_employee_chats_lists_open_tasks_only():
    occ = SimpleNamespace(id="occ-1", title="מדף", status=task_status.IN_PROGRESS)
    closed = SimpleNamespace(id="occ-2", title="סגור", status=task_status.COMPLETED)
    msg = SimpleNamespace(
        body="שאלה",
        photo_url=None,
        video_url=None,
        audio_url=None,
        file_url=None,
        created_at="2026-09-07T10:00:00+03:00",
    )
    repo = MagicMock()
    repo.list_open_chats_for_assignee.return_value = [(occ, msg), (closed, msg)]
    actor = ActorContext(user_id="emp-1", role=roles.EMPLOYEE, branch_id="b1")
    result = _svc(repo).list_employee_chats(actor)
    assert [item["id"] for item in result["items"]] == ["occ-1"]
    assert result["items"][0]["last_preview"] == "שאלה"
    repo.list_open_chats_for_assignee.assert_called_once_with(
        "emp-1", exclude_statuses=task_status.TERMINAL
    )


def test_employee_chats_denied_for_network_manager():
    actor = ActorContext(user_id="nm", role=roles.NETWORK_MANAGER, network_id="n1")
    with pytest.raises(PermissionError):
        _svc(MagicMock()).list_employee_chats(actor)
