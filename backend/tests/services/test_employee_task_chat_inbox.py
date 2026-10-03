"""Service — liste שיחות oved."""
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from app.domain import roles, task_status
from app.domain.scope import ActorContext
from app.services.task_message_service import TaskMessageService


def _svc(message_repo, occurrences=None):
    occs = occurrences or MagicMock()
    if occurrences is None:
        occs.list_occurrences.return_value = []
    return TaskMessageService(message_repo, occs, MagicMock(), MagicMock())


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


def test_employee_chats_include_today_tasks_without_messages():
    yesterday = SimpleNamespace(id="occ-old", title="אתמול", status=task_status.IN_PROGRESS)
    today_live = SimpleNamespace(id="occ-live", title="חי", status=task_status.IN_PROGRESS)
    today_empty = SimpleNamespace(
        id="occ-today",
        title="היום",
        status=task_status.PENDING,
        due_at="2026-10-03T08:00:00+03:00",
    )
    today_done = SimpleNamespace(id="occ-done", title="סגור", status=task_status.COMPLETED)
    def _msg(at: str):
        return SimpleNamespace(
            body="שאלה",
            photo_url=None,
            video_url=None,
            audio_url=None,
            file_url=None,
            created_at=at,
        )

    messages = MagicMock()
    messages.list_open_chats_for_assignee.return_value = [
        (yesterday, _msg("2026-10-02T10:00:00+03:00")),
        (today_live, _msg("2026-10-03T09:00:00+03:00")),
    ]
    occs = MagicMock()
    occs.list_occurrences.return_value = [today_live, today_empty, today_done]
    actor = ActorContext(user_id="emp-1", role=roles.EMPLOYEE, branch_id="b1")
    result = _svc(messages, occs).list_employee_chats(actor)
    assert [item["id"] for item in result["items"]] == ["occ-live", "occ-old", "occ-today"]
    assert result["items"][2]["last_preview"] is None
    occs.list_occurrences.assert_called_once()
    assert occs.list_occurrences.call_args.kwargs["assignee_user_id"] == "emp-1"


def test_employee_chats_denied_for_network_manager():
    actor = ActorContext(user_id="nm", role=roles.NETWORK_MANAGER, network_id="n1")
    with pytest.raises(PermissionError):
        _svc(MagicMock()).list_employee_chats(actor)
