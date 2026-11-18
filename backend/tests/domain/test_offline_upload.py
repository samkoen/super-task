from datetime import datetime, timezone

from app.domain import task_status
from app.domain.offline_upload import (
    MAX_OFFLINE_AGE,
    accepts_finish_signal,
    finished_at_from_client,
    keeps_awaiting_upload,
    needs_start,
)

NOW = datetime(2026, 11, 18, 12, 0, tzinfo=timezone.utc)


def test_finish_time_from_phone_is_kept_but_bounded():
    assert finished_at_from_client("2026-11-18T10:42:00Z", NOW) == datetime(2026, 11, 18, 10, 42, tzinfo=timezone.utc)
    assert finished_at_from_client("2026-11-18T13:00:00Z", NOW) == NOW
    assert finished_at_from_client("2026-11-01T10:00:00Z", NOW) == NOW - MAX_OFFLINE_AGE
    assert finished_at_from_client("pas une date", NOW) == NOW
    assert finished_at_from_client(None, NOW) == NOW


def test_only_open_tasks_wait_for_their_files():
    assert accepts_finish_signal(task_status.IN_PROGRESS)
    assert accepts_finish_signal(task_status.OVERDUE)
    assert not accepts_finish_signal(task_status.PENDING_REVIEW)
    assert not accepts_finish_signal(task_status.COMPLETED)
    assert needs_start(task_status.PENDING) and not needs_start(task_status.IN_PROGRESS)


def test_the_wait_ends_when_the_proof_arrives():
    assert keeps_awaiting_upload(task_status.IN_PROGRESS)
    assert not keeps_awaiting_upload(task_status.PENDING_REVIEW)
    assert not keeps_awaiting_upload(task_status.COMPLETED)
    assert not keeps_awaiting_upload(task_status.CANCELLED)

