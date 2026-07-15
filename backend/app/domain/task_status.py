"""Statuts de tâche."""

PENDING = "pending"
IN_PROGRESS = "in_progress"
PENDING_REVIEW = "pending_review"
COMPLETED = "completed"
OVERDUE = "overdue"
CANCELLED = "cancelled"

ACTIVE = {PENDING, IN_PROGRESS, OVERDUE, PENDING_REVIEW}
TERMINAL = {COMPLETED, CANCELLED}

COMPLETION_DONE = "completed"
COMPLETION_NOT_DONE = "not_completed"

REVIEW_PENDING = "pending"
REVIEW_APPROVED = "approved"
REVIEW_REJECTED = "rejected"
