import pytest

from app.domain.slot_review import (
    OUTCOME_APPROVED,
    OUTCOME_INCOMPLETE,
    OUTCOME_REJECTED,
    apply_decisions,
    carry_over_reviews,
    normalize_decision,
    normalize_decisions,
    rejection_summary,
    required_indices,
    review_of,
    review_outcome,
    strip_reviews,
)

NOW = "2026-10-28T10:00:00+02:00"


def _photos(n: int) -> list[dict]:
    return [{"kind": "photo", "url": f"/uploads/p{i}.jpg"} for i in range(n)]


def test_normalize_approved_ignores_remark():
    _, decision = normalize_decision(
        {"index": 0, "status": "approved", "remark": "x"}, count=1
    )
    assert decision == {"status": "approved"}


def test_normalize_rejected_keeps_remark_and_annotated_url():
    index, decision = normalize_decision(
        {"index": 1, "status": "rejected", "remark": " ליטוש ", "annotated_url": "/uploads/a.jpg"},
        count=2,
    )
    assert index == 1
    assert decision == {"status": "rejected", "remark": "ליטוש", "annotated_url": "/uploads/a.jpg"}


def test_normalize_rejected_drops_foreign_annotated_url():
    _, decision = normalize_decision(
        {"index": 0, "status": "rejected", "annotated_url": "javascript:alert(1)"}, count=1
    )
    assert decision == {"status": "rejected"}


@pytest.mark.parametrize(
    "raw",
    [
        None,
        {"index": 5, "status": "approved"},
        {"index": -1, "status": "approved"},
        {"index": "x", "status": "approved"},
        {"index": 0, "status": "maybe"},
        {"index": 0, "status": "rejected", "remark": "a" * 501},
    ],
)
def test_normalize_decision_rejects_invalid_input(raw):
    with pytest.raises(ValueError):
        normalize_decision(raw, count=2)


def test_normalize_decisions_requires_list_and_last_wins():
    with pytest.raises(ValueError):
        normalize_decisions({"index": 0}, count=1)
    out = normalize_decisions(
        [{"index": 0, "status": "rejected"}, {"index": 0, "status": "approved"}], count=1
    )
    assert out == {0: {"status": "approved"}}


def test_required_indices_follow_requirements_and_skip_extras():
    attachments = _photos(3)
    assert required_indices([{"kind": "photo"}, {"kind": "photo"}], attachments) == [0, 1]
    assert required_indices([], attachments) == [0, 1, 2]
    assert required_indices([{"kind": "photo"}], [{"kind": "photo", "url": ""}]) == []


def test_all_approved_is_approved():
    reviewed = apply_decisions(
        _photos(2), {0: {"status": "approved"}, 1: {"status": "approved"}}, reviewed_at=NOW
    )
    assert review_outcome(reviewed, [0, 1]) == OUTCOME_APPROVED
    assert review_of(reviewed[0])["reviewed_at"] == NOW


def test_one_rejection_means_rejected_even_if_others_pending():
    reviewed = apply_decisions(_photos(2), {1: {"status": "rejected"}}, reviewed_at=NOW)
    assert review_outcome(reviewed, [0, 1]) == OUTCOME_REJECTED


def test_missing_decision_is_incomplete():
    reviewed = apply_decisions(_photos(2), {0: {"status": "approved"}}, reviewed_at=NOW)
    assert review_outcome(reviewed, [0, 1]) == OUTCOME_INCOMPLETE


def test_optional_extra_does_not_block_approval():
    reviewed = apply_decisions(_photos(2), {0: {"status": "approved"}}, reviewed_at=NOW)
    assert review_outcome(reviewed, [0]) == OUTCOME_APPROVED


def test_outcome_without_anything_to_review_raises():
    with pytest.raises(ValueError):
        review_outcome([], [])


def test_apply_decisions_keeps_previous_review_on_untouched_slot():
    first = apply_decisions(_photos(2), {0: {"status": "approved"}}, reviewed_at=NOW)
    second = apply_decisions(first, {1: {"status": "approved"}}, reviewed_at=NOW)
    assert review_of(second[0])["status"] == "approved"
    assert review_of(second[1])["status"] == "approved"


def test_rejection_summary_lists_each_rejected_slot():
    reviewed = apply_decisions(
        _photos(3),
        {0: {"status": "approved"}, 1: {"status": "rejected", "remark": "מטושטש"}, 2: {"status": "rejected"}},
        reviewed_at=NOW,
    )
    text = rejection_summary(reviewed, ["מדף", "מקרר", ""], limit=500)
    assert "• מקרר: מטושטש" in text
    assert "• תת-משימה 3" in text
    assert "מדף" not in text


def test_rejection_summary_is_truncated():
    reviewed = apply_decisions(
        _photos(1), {0: {"status": "rejected", "remark": "ב" * 400}}, reviewed_at=NOW
    )
    assert len(rejection_summary(reviewed, ["x"], limit=100)) == 100


def test_carry_over_keeps_approved_when_file_unchanged():
    previous = apply_decisions(_photos(2), {0: {"status": "approved"}}, reviewed_at=NOW)
    current = [{"kind": "photo", "url": "/uploads/p0.jpg"}, {"kind": "photo", "url": "/uploads/new.jpg"}]
    out = carry_over_reviews(previous, current)
    assert review_of(out[0])["status"] == "approved"
    assert review_of(out[1]) is None


def test_carry_over_drops_review_when_file_replaced():
    previous = apply_decisions(_photos(1), {0: {"status": "approved"}}, reviewed_at=NOW)
    out = carry_over_reviews(previous, [{"kind": "photo", "url": "/uploads/other.jpg"}])
    assert review_of(out[0]) is None


def test_carry_over_keeps_old_file_of_unchanged_rejected_slot_to_review_again():
    previous = apply_decisions(_photos(1), {0: {"status": "rejected", "remark": "x"}}, reviewed_at=NOW)
    out = carry_over_reviews(previous, _photos(1))
    assert out[0]["url"] == _photos(1)[0]["url"]
    assert review_of(out[0]) is None


def test_unchanged_rejected_extra_still_blocks_until_reviewed_again():
    requirements = [{"kind": "photo"}]
    previous = apply_decisions(
        _photos(2),
        {0: {"status": "approved"}, 1: {"status": "rejected", "remark": "flou"}},
        reviewed_at=NOW,
    )
    resent = carry_over_reviews(previous, _photos(2), requirement_count=1)
    assert review_of(resent[0])["status"] == "approved"
    assert review_of(resent[1])["remark"] == "flou"
    skipped = apply_decisions(resent, {0: {"status": "approved"}}, reviewed_at=NOW)
    assert review_outcome(skipped, required_indices(requirements, skipped)) == OUTCOME_REJECTED
    accepted = apply_decisions(
        resent, {0: {"status": "approved"}, 1: {"status": "approved"}}, reviewed_at=NOW
    )
    assert review_outcome(accepted, required_indices(requirements, accepted)) == OUTCOME_APPROVED


def test_replaced_rejected_extra_no_longer_blocks():
    requirements = [{"kind": "photo"}]
    previous = apply_decisions(
        _photos(2), {0: {"status": "approved"}, 1: {"status": "rejected"}}, reviewed_at=NOW
    )
    replaced = carry_over_reviews(
        previous,
        [_photos(1)[0], {"kind": "photo", "url": "/uploads/new.jpg"}],
        requirement_count=1,
    )
    assert review_of(replaced[1]) is None
    decided = apply_decisions(replaced, {0: {"status": "approved"}}, reviewed_at=NOW)
    assert review_outcome(decided, required_indices(requirements, decided)) == OUTCOME_APPROVED


def test_carry_over_keeps_approved_and_resets_unchanged_rejected():
    previous = apply_decisions(
        _photos(2), {0: {"status": "approved"}, 1: {"status": "rejected"}}, reviewed_at=NOW
    )
    out = carry_over_reviews(previous, _photos(2))
    assert review_of(out[0])["status"] == "approved"
    assert review_of(out[1]) is None


def test_carry_over_accepts_rewritten_rejected_message():
    previous = apply_decisions(
        [{"kind": "message", "text": "ok"}], {0: {"status": "rejected"}}, reviewed_at=NOW
    )
    out = carry_over_reviews(previous, [{"kind": "message", "text": "corrigé"}])
    assert review_of(out[0]) is None


def test_carry_over_without_previous_is_identity():
    assert carry_over_reviews(None, _photos(1)) == _photos(1)


def test_strip_reviews_removes_only_review_key():
    reviewed = apply_decisions(_photos(1), {0: {"status": "approved"}}, reviewed_at=NOW)
    assert strip_reviews(reviewed) == _photos(1)
    assert strip_reviews(None) == []
