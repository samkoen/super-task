import pytest

from app.domain.slot_submit import (
    empty_slot,
    merge_slot,
    normalize_slot_attachment,
    parse_slot_index,
    pending_slot_indices,
    slot_already_sent,
)

VIDEO_REQ = {"kind": "video", "min_seconds": 10}
PHOTO_REQ = {"kind": "photo"}
REQS = [VIDEO_REQ, PHOTO_REQ, {"kind": "message"}]


def test_parse_slot_index_accepts_valid_range():
    assert parse_slot_index("1", count=3) == 1
    assert parse_slot_index(0, count=1) == 0


@pytest.mark.parametrize("value", [-1, 3, "abc", None])
def test_parse_slot_index_rejects_unknown_slot(value):
    with pytest.raises(ValueError, match="לא קיימת"):
        parse_slot_index(value, count=3)


def test_parse_slot_index_rejects_task_without_slots():
    with pytest.raises(ValueError, match="אין תתי-משימות"):
        parse_slot_index(0, count=0)


def test_normalize_video_slot_keeps_duration_and_poster():
    item = normalize_slot_attachment(
        VIDEO_REQ, {"kind": "video", "url": "/uploads/v.mp4", "duration_seconds": 12}
    )
    assert item == {"kind": "video", "url": "/uploads/v.mp4", "duration_seconds": 12}


def test_normalize_video_slot_rejects_too_short_video():
    with pytest.raises(ValueError, match="10 שניות"):
        normalize_slot_attachment(
            VIDEO_REQ, {"kind": "video", "url": "/uploads/v.mp4", "duration_seconds": 4}
        )


def test_normalize_slot_rejects_other_kind():
    with pytest.raises(ValueError, match="אינו תואם"):
        normalize_slot_attachment(PHOTO_REQ, {"kind": "video", "url": "/uploads/v.mp4"})


def test_normalize_slot_rejects_empty_file_and_non_dict():
    with pytest.raises(ValueError):
        normalize_slot_attachment(PHOTO_REQ, {"kind": "photo", "url": ""})
    with pytest.raises(ValueError):
        normalize_slot_attachment(PHOTO_REQ, None)


def test_normalize_message_slot_needs_text():
    assert normalize_slot_attachment({"kind": "message"}, {"kind": "message", "text": " hi "}) == {
        "kind": "message",
        "text": "hi",
    }
    with pytest.raises(ValueError):
        normalize_slot_attachment({"kind": "message"}, {"kind": "message", "text": "  "})


def test_merge_slot_pads_missing_slots_with_empty_placeholders():
    item = {"kind": "photo", "url": "/uploads/p.jpg"}
    merged = merge_slot(None, REQS, 1, item)
    assert merged == [empty_slot("video"), item, empty_slot("message")]


def test_merge_slot_replaces_only_the_target_and_keeps_extras():
    stored = [
        {"kind": "video", "url": "/uploads/v.mp4", "duration_seconds": 11},
        {"kind": "photo", "url": "/uploads/old.jpg"},
        {"kind": "message", "text": "ok"},
        {"kind": "photo", "url": "/uploads/extra.jpg"},
    ]
    new = {"kind": "photo", "url": "/uploads/new.jpg"}
    merged = merge_slot(stored, REQS, 1, new)
    assert merged[1] == new
    assert merged[0] == stored[0] and merged[3] == stored[3]
    assert stored[1]["url"] == "/uploads/old.jpg"


def test_pending_slots_lists_empty_slots_until_all_are_sent():
    merged = merge_slot(None, REQS, 1, {"kind": "photo", "url": "/uploads/p.jpg"})
    assert pending_slot_indices(REQS, merged) == [0, 2]


def test_pending_slots_empty_when_every_required_slot_is_filled():
    merged = [
        {"kind": "video", "url": "/uploads/v.mp4", "duration_seconds": 10},
        {"kind": "photo", "url": "/uploads/p.jpg"},
        {"kind": "message", "text": "ok"},
    ]
    assert pending_slot_indices(REQS, merged) == []


def test_pending_slots_counts_rejected_slot_until_replaced():
    merged = [
        {"kind": "photo", "url": "/uploads/a.jpg", "review": {"status": "approved"}},
        {"kind": "photo", "url": "/uploads/b.jpg", "review": {"status": "rejected"}},
    ]
    reqs = [PHOTO_REQ, PHOTO_REQ]
    assert pending_slot_indices(reqs, merged) == [1]
    replaced = merge_slot(merged, reqs, 1, {"kind": "photo", "url": "/uploads/c.jpg"})
    assert pending_slot_indices(reqs, replaced) == []


def test_pending_slots_ignores_extra_files_beyond_requirements():
    merged = [{"kind": "photo", "url": "/uploads/a.jpg"}, {"kind": "photo", "url": ""}]
    assert pending_slot_indices([PHOTO_REQ], merged) == []


def test_slot_already_sent_detects_same_file_for_same_slot():
    stored = [{"kind": "photo", "url": "/uploads/a.jpg"}]
    assert slot_already_sent(stored, 0, {"kind": "photo", "url": "/uploads/a.jpg"})
    assert not slot_already_sent(stored, 0, {"kind": "photo", "url": "/uploads/b.jpg"})
    assert not slot_already_sent(stored, 1, {"kind": "photo", "url": "/uploads/a.jpg"})
    assert not slot_already_sent(None, 0, {"kind": "photo", "url": "/uploads/a.jpg"})


def test_slot_already_sent_is_false_for_rejected_slot_with_same_file():
    stored = [{"kind": "photo", "url": "/uploads/a.jpg", "review": {"status": "rejected"}}]
    assert not slot_already_sent(stored, 0, {"kind": "photo", "url": "/uploads/a.jpg"})
