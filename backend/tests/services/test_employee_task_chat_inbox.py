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


def _msg(at: str):
    return SimpleNamespace(
        body="שאלה",
        photo_url=None,
        video_url=None,
        audio_url=None,
        file_url=None,
        created_at=at,
        sender_user_id="mgr",
    )


def test_employee_chats_split_current_startable_and_archive():
    yesterday = SimpleNamespace(id="occ-old", title="אתמול", status=task_status.IN_PROGRESS)
    old_done = SimpleNamespace(id="occ-archived", title="ישן", status=task_status.COMPLETED)
    today_live = SimpleNamespace(id="occ-live", title="חי", status=task_status.IN_PROGRESS)
    today_empty = SimpleNamespace(
        id="occ-today", title="היום", status=task_status.PENDING, due_at="2026-10-03T08:00:00+03:00"
    )
    messages = MagicMock()
    messages.list_open_chats_for_assignee.return_value = [
        (today_live, _msg("2026-10-03T09:00:00+03:00")),
        (yesterday, _msg("2026-10-02T10:00:00+03:00")),
        (old_done, _msg("2026-09-02T10:00:00+03:00")),
    ]
    messages.unread_counts.return_value = {"occ-live": 2}
    occs = MagicMock()
    occs.list_occurrences.return_value = [today_live, today_empty]
    actor = ActorContext(user_id="emp-1", role=roles.EMPLOYEE, branch_id="b1")
    result = _svc(messages, occs).list_employee_chats(actor)
    assert [item["id"] for item in result["items"]] == ["occ-live", "occ-old"]
    assert result["items"][0]["unread_count"] == 2
    assert result["items"][0]["last_preview"] == "שאלה"
    assert [item["id"] for item in result["startable"]] == ["occ-today"]
    assert result["archived_count"] == 1
    messages.list_open_chats_for_assignee.assert_called_once_with(
        "emp-1", exclude_statuses=frozenset()
    )
    assert occs.list_occurrences.call_args.kwargs["assignee_user_id"] == "emp-1"

    archive = _svc(messages, occs).list_employee_chat_archive(actor)
    assert [item["id"] for item in archive["items"]] == ["occ-archived"]


def test_employee_chats_denied_for_network_manager():
    actor = ActorContext(user_id="nm", role=roles.NETWORK_MANAGER, network_id="n1")
    with pytest.raises(PermissionError):
        _svc(MagicMock()).list_employee_chats(actor)
