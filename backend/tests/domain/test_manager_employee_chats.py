from datetime import datetime, timezone
from types import SimpleNamespace

from app.domain.manager_employee_chats import (
    contact_unread_total,
    manager_task_chat_card,
    sort_manager_day_chats,
)


def test_contact_unread_total_sums_direct_and_task():
    assert contact_unread_total(1, 2) == 3
    assert contact_unread_total(0, 0) == 0


def test_manager_task_chat_card_without_message():
    occ = SimpleNamespace(id="o1", title="מדף", status="pending")
    card = manager_task_chat_card(occ, None, 0)
    assert card["id"] == "o1"
    assert card["last_preview"] is None
    assert card["unread_count"] == 0


def test_manager_task_chat_card_with_preview():
    occ = SimpleNamespace(id="o1", title="מדף", status="in_progress")
    msg = SimpleNamespace(
        body="שאלה",
        photo_url=None,
        video_url=None,
        audio_url=None,
        file_url=None,
        created_at="2026-09-14T10:00:00+03:00",
    )
    card = manager_task_chat_card(occ, msg, 4)
    assert card["last_preview"] == "שאלה"
    assert card["unread_count"] == 4


def test_manager_task_chat_card_normalizes_datetime_last_at():
    occ = SimpleNamespace(id="o1", title="מדף", status="in_progress")
    created = datetime(2026, 9, 14, 10, 0, tzinfo=timezone.utc)
    msg = SimpleNamespace(
        body="שאלה",
        photo_url=None,
        video_url=None,
        audio_url=None,
        file_url=None,
        created_at=created,
    )
    card = manager_task_chat_card(occ, msg, 0)
    assert card["last_at"] == created.isoformat()


def test_sort_manager_day_chats_puts_recent_first():
    empty = {"id": "a", "last_at": None, "title": "ריק"}
    older = {"id": "b", "last_at": "2026-09-14T08:00:00+03:00", "title": "ישן"}
    newer = {"id": "c", "last_at": "2026-09-14T12:00:00+03:00", "title": "חדש"}
    assert [i["id"] for i in sort_manager_day_chats([empty, older, newer])] == ["c", "b", "a"]


def test_sort_manager_day_chats_mixes_datetime_and_empty():
    empty = {"id": "a", "last_at": None}
    stamped = {
        "id": "b",
        "last_at": datetime(2026, 9, 14, 10, 0, tzinfo=timezone.utc),
    }
    assert [i["id"] for i in sort_manager_day_chats([empty, stamped])] == ["b", "a"]
