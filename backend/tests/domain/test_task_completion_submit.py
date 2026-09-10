import pytest

from app.domain import task_status
from app.domain.task_completion_submit import (
    employee_submission_needs_review,
    normalize_completion_status,
    normalize_not_completed_reason,
    requires_completion_media,
)


def test_accepts_done_and_not_done():
    assert normalize_completion_status("completed") == task_status.COMPLETION_DONE
    assert normalize_completion_status("not_completed") == task_status.COMPLETION_NOT_DONE


def test_rejects_unknown_status():
    with pytest.raises(ValueError, match="סטטוס סיום"):
        normalize_completion_status("skipped")


def test_not_completed_requires_a_reason():
    assert (
        normalize_not_completed_reason(task_status.COMPLETION_NOT_DONE, "  אין מה לצלם  ")
        == "אין מה לצלם"
    )
    with pytest.raises(ValueError, match="יש להסביר"):
        normalize_not_completed_reason(task_status.COMPLETION_NOT_DONE, "   ")


def test_done_ignores_reason_and_requires_media():
    assert normalize_not_completed_reason(task_status.COMPLETION_DONE, "x") is None
    assert requires_completion_media(task_status.COMPLETION_DONE) is True
    assert requires_completion_media(task_status.COMPLETION_NOT_DONE) is False


def test_assignee_submission_always_goes_to_review():
    assert employee_submission_needs_review(True) is True
    assert employee_submission_needs_review(False) is False
