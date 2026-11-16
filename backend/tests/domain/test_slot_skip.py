import pytest

from app.domain.completion_media import attachment_urls, normalize_attachments
from app.domain.slot_review import OUTCOME_APPROVED, apply_decisions, required_indices, review_outcome
from app.domain.slot_skip import has_skipped, is_skipped, normalize_skip, same_skip, skipped_of
from app.domain.slot_submit import (
    merge_slot,
    normalize_slot_attachment,
    pending_slot_indices,
    slot_already_sent,
)

VIDEO_REQ = {"kind": "video", "min_seconds": 10}
PHOTO_REQ = {"kind": "photo"}


def _skip(code="area_blocked", **extra):
    return {"reason_code": code, **extra}


def test_normalize_skip_keeps_code_text_and_audio():
    skip = normalize_skip(_skip(reason_text="  שער נעול ", audio_url="/uploads/a.webm"))
    assert skip == {"reason_code": "area_blocked", "reason_text": "שער נעול", "audio_url": "/uploads/a.webm"}


def test_normalize_skip_with_only_a_code_is_valid_for_predefined_reasons():
    assert normalize_skip(_skip("no_stock")) == {"reason_code": "no_stock"}


@pytest.mark.parametrize("raw", [None, "x", {}, {"reason_code": "nope"}])
def test_normalize_skip_rejects_unknown_reason(raw):
    with pytest.raises(ValueError):
        normalize_skip(raw)


def test_other_reason_needs_text_or_audio():
    with pytest.raises(ValueError, match="לפרט"):
        normalize_skip(_skip("other"))
    assert normalize_skip(_skip("other", reason_text="x"))["reason_text"] == "x"
    assert normalize_skip(_skip("other", audio_url="/uploads/a.webm"))["audio_url"] == "/uploads/a.webm"


def test_skip_rejects_too_long_text_and_foreign_audio_url():
    with pytest.raises(ValueError, match="ארוך"):
        normalize_skip(_skip(reason_text="x" * 501))
    with pytest.raises(ValueError):
        normalize_skip(_skip(audio_url="javascript:alert(1)"))


def test_skipped_slot_is_accepted_for_its_own_kind_without_a_file():
    item = normalize_slot_attachment(VIDEO_REQ, {"kind": "video", "skipped": _skip()})
    assert item == {"kind": "video", "url": "", "skipped": {"reason_code": "area_blocked"}}
    assert is_skipped(item) and skipped_of(item) == {"reason_code": "area_blocked"}


def test_skipped_slot_still_needs_the_right_kind():
    with pytest.raises(ValueError, match="אינו תואם"):
        normalize_slot_attachment(PHOTO_REQ, {"kind": "video", "skipped": _skip()})


def test_skipped_message_slot_has_empty_text():
    item = normalize_slot_attachment({"kind": "message"}, {"kind": "message", "skipped": _skip("camera_issue")})
    assert item["text"] == "" and is_skipped(item)


def test_skipped_slot_is_not_pending_but_an_empty_one_is():
    reqs = [PHOTO_REQ, PHOTO_REQ]
    skipped = normalize_slot_attachment(PHOTO_REQ, {"kind": "photo", "skipped": _skip()})
    merged = merge_slot(None, reqs, 0, skipped)
    assert pending_slot_indices(reqs, merged) == [1]


def test_a_real_file_replaces_a_previous_skip():
    reqs = [PHOTO_REQ]
    skipped = normalize_slot_attachment(PHOTO_REQ, {"kind": "photo", "skipped": _skip()})
    merged = merge_slot(None, reqs, 0, skipped)
    filmed = {"kind": "photo", "url": "/uploads/p.jpg"}
    assert not slot_already_sent(merged, 0, filmed)
    replaced = merge_slot(merged, reqs, 0, filmed)
    assert not has_skipped(replaced)


def test_same_skip_is_idempotent_on_resend():
    stored = [{"kind": "photo", "url": "", "skipped": _skip("no_stock")}]
    again = {"kind": "photo", "url": "", "skipped": _skip("no_stock")}
    assert same_skip(stored[0], again)
    assert slot_already_sent(stored, 0, again)
    assert not slot_already_sent(stored, 0, {"kind": "photo", "url": "", "skipped": _skip("other", reason_text="x")})


def test_skip_audio_is_listed_with_the_attachment_urls():
    items = normalize_attachments([{"kind": "video", "skipped": _skip(audio_url="/uploads/a.webm")}])
    assert attachment_urls(items) == ["/uploads/a.webm"]


def test_skipped_slots_are_not_reviewable_but_do_not_block_review():
    attachments = [
        {"kind": "photo", "url": "/uploads/p.jpg"},
        {"kind": "photo", "url": "", "skipped": _skip()},
    ]
    reqs = [PHOTO_REQ, PHOTO_REQ]
    assert required_indices(reqs, attachments) == [0]
    reviewed = apply_decisions(attachments, {0: {"status": "approved"}, 1: {"status": "approved"}}, reviewed_at="t")
    assert "review" not in reviewed[1]
    assert review_outcome(reviewed, required_indices(reqs, reviewed)) == OUTCOME_APPROVED


def test_task_where_everything_is_skipped_has_nothing_to_review_but_is_approvable():
    attachments = [{"kind": "photo", "url": "", "skipped": _skip()}]
    assert review_outcome(attachments, required_indices([PHOTO_REQ], attachments)) == OUTCOME_APPROVED


def test_empty_task_still_has_nothing_to_review():
    with pytest.raises(ValueError):
        review_outcome([{"kind": "photo", "url": ""}], [])
