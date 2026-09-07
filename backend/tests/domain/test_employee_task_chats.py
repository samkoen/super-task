"""Tests liste שיחות oved — tâches avec chat encore ouvertes."""
from types import SimpleNamespace

from app.domain import task_status
from app.domain.employee_task_chats import (
    employee_task_chat_card,
    is_open_employee_chat_task,
    sort_employee_task_chats,
)


def test_open_chat_tasks_exclude_closed():
    assert is_open_employee_chat_task(task_status.IN_PROGRESS) is True
    assert is_open_employee_chat_task(task_status.AWAITING_RESPONSE) is True
    assert is_open_employee_chat_task(task_status.PENDING_REVIEW) is True
    assert is_open_employee_chat_task(task_status.COMPLETED) is False
    assert is_open_employee_chat_task(task_status.CANCELLED) is False


def test_card_uses_last_message_preview():
    occ = SimpleNamespace(id="occ-1", title="מדף חלב", status=task_status.IN_PROGRESS)
    msg = SimpleNamespace(
        body="צריך עזרה",
        photo_url=None,
        video_url=None,
        audio_url=None,
        file_url=None,
        created_at="2026-09-07T10:00:00+03:00",
    )
    card = employee_task_chat_card(occ, msg)
    assert card["id"] == "occ-1"
    assert card["title"] == "מדף חלב"
    assert card["last_preview"] == "צריך עזרה"
    assert card["last_at"] == "2026-09-07T10:00:00+03:00"


def test_card_preview_falls_back_to_media_icon():
    occ = SimpleNamespace(id="occ-2", title="קופה", status=task_status.AWAITING_RESPONSE)
    msg = SimpleNamespace(
        body="  ",
        photo_url="/p.jpg",
        video_url=None,
        audio_url=None,
        file_url=None,
        created_at="2026-09-07T11:00:00+03:00",
    )
    assert employee_task_chat_card(occ, msg)["last_preview"] == "📷"


def test_sorts_newest_chat_first():
    older = {"id": "a", "last_at": "2026-09-07T09:00:00+03:00"}
    newer = {"id": "b", "last_at": "2026-09-07T12:00:00+03:00"}
    empty = {"id": "c", "last_at": None}
    assert [i["id"] for i in sort_employee_task_chats([older, empty, newer])] == [
        "b",
        "a",
        "c",
    ]
