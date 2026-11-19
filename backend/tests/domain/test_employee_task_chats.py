"""Tests liste שיחות oved — tâches avec chat encore ouvertes."""
from types import SimpleNamespace

from app.domain import task_status
from app.domain.employee_task_chats import (
    chat_status_tag,
    chat_visual_kind,
    employee_task_chat_card,
    is_open_employee_chat_task,
    sort_employee_task_chats,
    split_employee_chats,
)


def test_open_chat_tasks_exclude_closed():
    assert is_open_employee_chat_task(task_status.IN_PROGRESS) is True
    assert is_open_employee_chat_task(task_status.AWAITING_RESPONSE) is True
    assert is_open_employee_chat_task(task_status.PENDING_REVIEW) is True
    assert is_open_employee_chat_task(task_status.COMPLETED) is False
    assert is_open_employee_chat_task(task_status.CANCELLED) is False


def test_card_uses_last_message_preview():
    occ = SimpleNamespace(
        id="occ-1",
        title="מדף חלב",
        status=task_status.IN_PROGRESS,
        due_at="2026-09-07T08:00:00+03:00",
    )
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
    assert card["due_at"] == "2026-09-07T08:00:00+03:00"


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


def test_card_without_message_has_no_preview():
    occ = SimpleNamespace(
        id="occ-3",
        title="היום",
        status=task_status.PENDING,
        due_at="2026-10-03T08:00:00+03:00",
    )
    card = employee_task_chat_card(occ)
    assert card["last_preview"] is None
    assert card["last_at"] is None
    assert card["due_at"] == "2026-10-03T08:00:00+03:00"


def test_split_keeps_shift_chats_and_offers_tasks_without_chat():
    old_open = SimpleNamespace(id="old-open", status=task_status.IN_PROGRESS)
    old_done = SimpleNamespace(id="old-done", status=task_status.COMPLETED)
    live = SimpleNamespace(id="live", status=task_status.IN_PROGRESS)
    done_today = SimpleNamespace(id="done", status=task_status.COMPLETED)
    empty = SimpleNamespace(id="empty", status=task_status.PENDING)
    closed_empty = SimpleNamespace(id="closed-empty", status=task_status.COMPLETED)
    chats = [(live, "m1"), (done_today, "m2"), (old_open, "m3"), (old_done, "m4"), (live, "dup")]
    out = split_employee_chats(chats, [live, done_today, empty, closed_empty])
    assert [occ.id for occ, _ in out["current"]] == ["live", "done", "old-open"]
    assert [occ.id for occ, _ in out["archived"]] == ["old-done"]
    assert [occ.id for occ in out["startable"]] == ["empty"]


def test_visual_kind_follows_requirements_then_category():
    def occ(**kw):
        return SimpleNamespace(**kw)

    assert chat_visual_kind(occ(completion_requirements=[{"kind": "video"}])) == "video"
    assert chat_visual_kind(occ(min_video_seconds=20)) == "video"
    assert chat_visual_kind(occ(completion_requirements=[{"kind": "photo"}])) == "photo"
    assert chat_visual_kind(occ(ops_category="cleaning")) == "cleaning"
    assert chat_visual_kind(occ(ops_category="info_collection")) == "check"
    assert chat_visual_kind(occ()) == "physical"


def test_status_tag_from_status_and_review():
    rejected = SimpleNamespace(manager_review_status=task_status.REVIEW_REJECTED)
    assert chat_status_tag(SimpleNamespace(status=task_status.COMPLETED)) == "approved"
    assert chat_status_tag(SimpleNamespace(status=task_status.PENDING_REVIEW)) == "pending_review"
    assert (
        chat_status_tag(SimpleNamespace(status=task_status.IN_PROGRESS, awaiting_upload_at="x"))
        == "awaiting_upload"
    )
    assert chat_status_tag(SimpleNamespace(status=task_status.IN_PROGRESS), rejected) == "retake"
    assert chat_status_tag(SimpleNamespace(status=task_status.IN_PROGRESS)) is None


def test_card_counts_unread_and_own_last_message():
    occ = SimpleNamespace(id="o", title="t", status=task_status.IN_PROGRESS)
    msg = SimpleNamespace(
        body="היי", photo_url=None, video_url=None, audio_url=None, file_url=None,
        created_at="2026-09-07T10:00:00+03:00", sender_user_id="emp-1",
    )
    card = employee_task_chat_card(occ, msg, unread=2, viewer_id="emp-1")
    assert card["unread_count"] == 2
    assert card["last_mine"] is True
    assert card["visual_kind"] == "physical"


def test_sorts_newest_chat_first():
    older = {"id": "a", "last_at": "2026-09-07T09:00:00+03:00"}
    newer = {"id": "b", "last_at": "2026-09-07T12:00:00+03:00"}
    empty = {"id": "c", "last_at": None}
    assert [i["id"] for i in sort_employee_task_chats([older, empty, newer])] == [
        "b",
        "a",
        "c",
    ]
