"""Statuts de tâche."""

PENDING = "pending"
IN_PROGRESS = "in_progress"
COMPLETED = "completed"
OVERDUE = "overdue"
CANCELLED = "cancelled"

ACTIVE = {PENDING, IN_PROGRESS, OVERDUE}
TERMINAL = {COMPLETED, CANCELLED}

COMPLETION_DONE = "completed"
COMPLETION_NOT_DONE = "not_completed"
