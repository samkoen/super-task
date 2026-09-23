from types import SimpleNamespace

from app.domain import task_status
from app.domain.manager_waiting import (
    manager_is_waiting,
    select_manager_waiting,
    waiting_message_preview,
)


def _task(**kwargs):
    defaults = {
        "id": "t1",
        "status": task_status.IN_PROGRESS,
        "assignee_user_id": "e1",
    }
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


def _message(**kwargs):
    defaults = {
        "sender_user_id": "m1",
        "created_at": "2026-09-23T10:00:00+03:00",
        "body": "תסתכל בתמונה",
        "body_translated": None,
        "photo_url": None,
        "video_url": None,
        "audio_url": None,
        "file_url": None,
    }
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


def test_manager_last_message_marks_open_task():
    assert manager_is_waiting(task_status.IN_PROGRESS, "e1", "m1")
    assert manager_is_waiting(task_status.OVERDUE, "e1", "m1")
    assert manager_is_waiting(task_status.PENDING, "e1", "m1")


def test_employee_reply_clears_the_wait():
    assert not manager_is_waiting(task_status.AWAITING_RESPONSE, "e1", "e1")
    assert not manager_is_waiting(task_status.IN_PROGRESS, "e1", "e1")


def test_submitted_or_closed_task_is_not_waiting():
    assert not manager_is_waiting(task_status.PENDING_REVIEW, "e1", "m1")
    assert not manager_is_waiting(task_status.COMPLETED, "e1", "m1")
    assert not manager_is_waiting(task_status.CANCELLED, "e1", "m1")


def test_missing_sender_is_not_waiting():
    assert not manager_is_waiting(task_status.IN_PROGRESS, "e1", None)
    assert not manager_is_waiting(task_status.IN_PROGRESS, None, "m1")


def test_selects_only_manager_last_messages_newest_first():
    older = _task(id="old")
    newer = _task(id="new", status=task_status.OVERDUE)
    replied = _task(id="replied", status=task_status.AWAITING_RESPONSE)
    sent = _task(id="sent", status=task_status.PENDING_REVIEW)
    silent = _task(id="silent", status=task_status.PENDING)
    last = {
        "old": _message(created_at="2026-09-23T09:00:00+03:00", body="קודם"),
        "new": _message(created_at="2026-09-23T11:00:00+03:00", body="עכשיו"),
        "replied": _message(sender_user_id="e1", body="הבנתי"),
        "sent": _message(body="עוד"),
    }
    selected = select_manager_waiting([older, newer, replied, sent, silent], last)
    assert [task.id for task, _message in selected] == ["new", "old"]


def test_preview_uses_the_employee_translation():
    preview = waiting_message_preview(
        _message(body="תסתכל", body_translated="look at the photo")
    )
    assert preview == "look at the photo"


def test_preview_falls_back_to_original_text():
    assert waiting_message_preview(_message(body="תסתכל")) == "תסתכל"
