"""Statuts de tâche."""

PENDING = "pending"
IN_PROGRESS = "in_progress"
PENDING_REVIEW = "pending_review"
AWAITING_RESPONSE = "awaiting_response"  # ממתין לתגובה (chat)
COMPLETED = "completed"
OVERDUE = "overdue"
CANCELLED = "cancelled"

ACTIVE = {PENDING, IN_PROGRESS, OVERDUE, PENDING_REVIEW, AWAITING_RESPONSE}
TERMINAL = {COMPLETED, CANCELLED}


def employee_may_submit(status: str) -> bool:
    """L'oved peut encore joindre photo/vidéo/audio, y compris en attendant une réponse chat."""
    return status in {IN_PROGRESS, AWAITING_RESPONSE}

COMPLETION_DONE = "completed"
COMPLETION_NOT_DONE = "not_completed"

REVIEW_PENDING = "pending"
REVIEW_APPROVED = "approved"
REVIEW_REJECTED = "rejected"
