"""Overdue marking must not revert in-progress work."""
from datetime import datetime
from unittest.mock import MagicMock
from zoneinfo import ZoneInfo

from app.domain import task_status
from app.repositories.task_occurrence_repository import TaskOccurrenceRepository

TZ = ZoneInfo("Asia/Jerusalem")


def test_mark_overdue_before_uses_bulk_update():
    db = MagicMock()
    result = MagicMock()
    result.rowcount = 3
    db.execute.return_value = result

    repo = TaskOccurrenceRepository(db)
    count = repo.mark_overdue_before(datetime.now(TZ))

    assert count == 3
    db.execute.assert_called_once()
    db.flush.assert_called_once()
    stmt = db.execute.call_args[0][0]
    # UPDATE … SET status = overdue WHERE pending AND due_at < now
    compiled = str(stmt.compile(compile_kwargs={"literal_binds": False}))
    assert "task_occurrences" in compiled.lower() or "TaskOccurrence" in type(stmt).__name__


def test_mark_overdue_before_empty_branch_scope_is_noop():
    db = MagicMock()
    repo = TaskOccurrenceRepository(db)
    assert repo.mark_overdue_before(datetime.now(TZ), branch_ids=[]) == 0
    db.execute.assert_not_called()
