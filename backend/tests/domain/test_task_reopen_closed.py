from app.domain import task_status
from app.domain.task_reopen_closed import (
    REOPEN_CLOSED_STATUS,
    can_reopen_closed_occurrence,
    reopen_closed_blocked_reason,
)


def test_can_reopen_only_completed_and_approved():
    assert can_reopen_closed_occurrence(
        status=task_status.COMPLETED,
        manager_review_status=task_status.REVIEW_APPROVED,
    )
    assert REOPEN_CLOSED_STATUS == task_status.IN_PROGRESS


def test_cannot_reopen_when_already_open():
    assert not can_reopen_closed_occurrence(
        status=task_status.IN_PROGRESS,
        manager_review_status=task_status.REVIEW_APPROVED,
    )
    assert not can_reopen_closed_occurrence(
        status=task_status.PENDING_REVIEW,
        manager_review_status=task_status.REVIEW_PENDING,
    )
    assert reopen_closed_blocked_reason(
        status=task_status.IN_PROGRESS,
        manager_review_status=None,
    ) == "המשימה כבר פתוחה"


def test_cannot_reopen_without_approved_review():
    assert not can_reopen_closed_occurrence(
        status=task_status.COMPLETED,
        manager_review_status=None,
    )
    assert not can_reopen_closed_occurrence(
        status=task_status.COMPLETED,
        manager_review_status=task_status.REVIEW_PENDING,
    )
    assert not can_reopen_closed_occurrence(status=None, manager_review_status=None)
    assert reopen_closed_blocked_reason(
        status=task_status.COMPLETED,
        manager_review_status=None,
    ) == "ניתן לפתוח מחדש רק משימה שאושרה ונסגרה"
