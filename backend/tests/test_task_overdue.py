"""Overdue marking must not revert in-progress work."""
from datetime import datetime
from unittest.mock import MagicMock
from uuid import uuid4
from zoneinfo import ZoneInfo

from app.domain import task_status
from app.repositories.task_occurrence_repository import TaskOccurrenceRepository

TZ = ZoneInfo("Asia/Jerusalem")


def test_mark_overdue_before_only_affects_pending():
    pending = MagicMock()
    pending.status = task_status.PENDING
    pending.due_at = datetime(2020, 1, 1, tzinfo=TZ)

    in_progress = MagicMock()
    in_progress.status = task_status.IN_PROGRESS
    in_progress.due_at = datetime(2020, 1, 1, tzinfo=TZ)

    db = MagicMock()
    scalars = MagicMock()
    scalars.all.return_value = [pending]
    execute_result = MagicMock()
    execute_result.scalars.return_value = scalars
    db.execute.return_value = execute_result

    repo = TaskOccurrenceRepository(db)
    count = repo.mark_overdue_before(datetime.now(TZ))

    assert count == 1
    assert pending.status == task_status.OVERDUE
    assert in_progress.status == task_status.IN_PROGRESS
