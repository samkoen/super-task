"""Règle : rouvrir une occurrence déjà approuvée et fermée."""

from app.domain import task_status

REOPEN_CLOSED_STATUS = task_status.IN_PROGRESS


def can_reopen_closed_occurrence(
    *,
    status: str | None,
    manager_review_status: str | None,
) -> bool:
    """True seulement si la même occurrence est completed + approved."""
    return (
        status == task_status.COMPLETED
        and manager_review_status == task_status.REVIEW_APPROVED
    )


def reopen_closed_blocked_reason(
    *,
    status: str | None,
    manager_review_status: str | None,
) -> str:
    if status in task_status.ACTIVE:
        return "המשימה כבר פתוחה"
    return "ניתן לפתוח מחדש רק משימה שאושרה ונסגרה"
