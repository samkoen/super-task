"""Tests chat tâche + transitions ממתין לתגובה."""
from __future__ import annotations

import asyncio
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from zoneinfo import ZoneInfo

import pytest

from app.domain import roles, task_status
from app.domain.scope import ActorContext
from app.domain.task_chat import (
    can_employee_post,
    can_manager_post,
    has_message_content,
    next_status_after_employee_message,
    next_status_after_manager_message,
)
from app.models.task_message import TaskMessage
from app.models.task_occurrence import TaskOccurrence
from app.services.task_message_service import TaskMessageService

TZ = ZoneInfo("Asia/Jerusalem")


def test_chat_rules_content_and_status():
    assert has_message_content("שלום", None, None, None)
    assert has_message_content(None, "/p.jpg", None, None)
    assert not has_message_content("  ", None, None, None)
    assert can_employee_post(task_status.IN_PROGRESS)
    assert can_employee_post(task_status.AWAITING_RESPONSE)
    assert not can_employee_post(task_status.PENDING_REVIEW)
    assert can_manager_post(task_status.PENDING_REVIEW)
    assert next_status_after_employee_message(task_status.IN_PROGRESS) == task_status.AWAITING_RESPONSE
    assert next_status_after_manager_message(task_status.AWAITING_RESPONSE) == task_status.IN_PROGRESS
    assert next_status_after_manager_message(task_status.IN_PROGRESS) is None


def _occurrence(**kwargs) -> TaskOccurrence:
    defaults = {
        "id": "occ-1",
        "template_id": None,
        "branch_id": "b1",
        "title": "ניקוי",
        "description": "",
        "due_at": "2026-07-14T10:00:00+03:00",
        "status": task_status.IN_PROGRESS,
        "assignee_user_id": "emp-1",
        "department_id": None,
        "task_kind": "fixed",
        "manager_user_id": "mgr-1",
        "photo_required": True,
        "reference_photo_url": None,
        "reference_video_url": None,
        "reference_audio_url": None,
        "media_purge_after": None,
        "started_at": "2026-07-14T09:00:00+03:00",
        "started_by_id": "emp-1",
        "created_by_id": "mgr-1",
        "created_at": "2026-07-14T08:00:00+03:00",
        "updated_at": "2026-07-14T08:00:00+03:00",
    }
    defaults.update(kwargs)
    return TaskOccurrence(**defaults)


def _message(**kwargs) -> TaskMessage:
    defaults = {
        "id": "m1",
        "occurrence_id": "occ-1",
        "sender_user_id": "emp-1",
        "body": "לא הבנתי",
        "photo_url": None,
        "video_url": None,
        "audio_url": None,
        "created_at": datetime.now(TZ).isoformat(),
        "body_translated": None,
        "audio_transcript": None,
        "audio_transcript_sender": None,
    }
    defaults.update(kwargs)
    return TaskMessage(**defaults)


def test_employee_message_sets_awaiting_response():
    occurrence = _occurrence()
    message_repo = MagicMock()
    created = _message()
    message_repo.create.return_value = created
    message_repo.update_i18n.return_value = created
    occurrence_repo = MagicMock()
    occurrence_repo.find_by_id.side_effect = [
        occurrence,
        _occurrence(status=task_status.AWAITING_RESPONSE),
    ]
    user_repo = MagicMock()
    user_repo.find_by_id.return_value = MagicMock(
        full_name="יוסי", role=roles.EMPLOYEE, preferred_language="th"
    )
    branch_repo = MagicMock()

    service = TaskMessageService(
        message_repo, occurrence_repo, user_repo, branch_repo
    )
    actor = ActorContext(
        user_id="emp-1",
        role=roles.EMPLOYEE,
        branch_id="b1",
        network_id="n1",
    )
    with patch.object(service, "_enrich_i18n", new=AsyncMock(return_value=created)):
        result = asyncio.run(service.post_message(actor, "occ-1", body="לא הבנתי"))
    occurrence_repo.update_status.assert_called_once_with(
        "occ-1", task_status.AWAITING_RESPONSE
    )
    assert result["event_type"] == "task_message_employee"


def test_manager_reply_returns_in_progress():
    occurrence = _occurrence(status=task_status.AWAITING_RESPONSE)
    message_repo = MagicMock()
    created = _message(id="m2", sender_user_id="mgr-1", body="תסתכל בתמונה")
    message_repo.create.return_value = created
    occurrence_repo = MagicMock()
    occurrence_repo.find_by_id.side_effect = [
        occurrence,
        _occurrence(status=task_status.IN_PROGRESS),
    ]
    user_repo = MagicMock()
    user_repo.find_by_id.return_value = MagicMock(
        full_name="מנהל", role=roles.BRANCH_MANAGER, preferred_language="he"
    )
    branch = MagicMock(id="b1", network_id="n1")
    branch_repo = MagicMock()
    branch_repo.find_by_id.return_value = branch

    service = TaskMessageService(
        message_repo, occurrence_repo, user_repo, branch_repo
    )
    actor = ActorContext(
        user_id="mgr-1",
        role=roles.BRANCH_MANAGER,
        branch_id="b1",
        network_id="n1",
    )
    with patch.object(service, "_enrich_i18n", new=AsyncMock(return_value=created)):
        result = asyncio.run(service.post_message(actor, "occ-1", body="תסתכל בתמונה"))
    occurrence_repo.update_status.assert_called_once_with(
        "occ-1", task_status.IN_PROGRESS
    )
    assert result["event_type"] == "task_message_manager"


def test_employee_cannot_post_while_pending_review():
    occurrence = _occurrence(status=task_status.PENDING_REVIEW)
    occurrence_repo = MagicMock()
    occurrence_repo.find_by_id.return_value = occurrence
    service = TaskMessageService(
        MagicMock(), occurrence_repo, MagicMock(), MagicMock()
    )
    actor = ActorContext(
        user_id="emp-1",
        role=roles.EMPLOYEE,
        branch_id="b1",
        network_id="n1",
    )
    with pytest.raises(ValueError):
        asyncio.run(service.post_message(actor, "occ-1", body="?"))


def test_list_messages_returns_display_body_for_manager():
    occurrence = _occurrence(status=task_status.AWAITING_RESPONSE)
    message_repo = MagicMock()
    message_repo.list_for_occurrence.return_value = [
        _message(body="sawasdee", body_translated="שלום"),
    ]
    occurrence_repo = MagicMock()
    occurrence_repo.find_by_id.return_value = occurrence
    user_repo = MagicMock()
    user_repo.find_by_id.return_value = MagicMock(
        full_name="יוסי", role=roles.EMPLOYEE, preferred_language="th"
    )
    branch = MagicMock(id="b1", network_id="n1")
    branch_repo = MagicMock()
    branch_repo.find_by_id.return_value = branch

    service = TaskMessageService(
        message_repo, occurrence_repo, user_repo, branch_repo
    )
    actor = ActorContext(
        user_id="mgr-1",
        role=roles.BRANCH_MANAGER,
        branch_id="b1",
        network_id="n1",
    )
    items = service.list_messages(actor, "occ-1")
    assert items[0]["display_body"] == "שלום"
    assert items[0]["body"] == "sawasdee"
