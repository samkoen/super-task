from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from app.domain.scope import ActorContext
from app.services.task_occurrence_service import TaskOccurrenceService


def _actor(role: str = "branch_manager", user_id: str = "mgr-1", branch_id: str = "br-1"):
    return ActorContext(user_id=user_id, role=role, branch_id=branch_id, network_id="net-1")


def _service(occurrence):
    occurrences = MagicMock()
    occurrences.find_by_id.return_value = occurrence
    occurrences.clear_manager_next_for_assignee = MagicMock()
    occurrences.set_manager_next.return_value = occurrence
    svc = TaskOccurrenceService(
        occurrences,
        MagicMock(),
        MagicMock(),
        MagicMock(),
    )
    svc._assert_branch_access = MagicMock()  # type: ignore[method-assign]
    svc._to_api = MagicMock(return_value={"id": occurrence.id, "is_manager_next": True})  # type: ignore[method-assign]
    return svc, occurrences


def test_set_manager_next_clears_other_and_sets():
    occurrence = SimpleNamespace(
        id="occ-1",
        branch_id="br-1",
        assignee_user_id="emp-1",
        status="pending",
    )
    svc, occurrences = _service(occurrence)
    result = svc.set_manager_next(_actor(), "occ-1", enabled=True)
    occurrences.clear_manager_next_for_assignee.assert_called_once_with("emp-1")
    occurrences.set_manager_next.assert_called_once()
    assert result["id"] == "occ-1"


def test_set_manager_next_clear_only():
    occurrence = SimpleNamespace(
        id="occ-1",
        branch_id="br-1",
        assignee_user_id="emp-1",
        status="pending",
    )
    svc, occurrences = _service(occurrence)
    svc.set_manager_next(_actor(), "occ-1", enabled=False)
    occurrences.clear_manager_next_for_assignee.assert_not_called()
    occurrences.set_manager_next.assert_called_once_with("occ-1", manager_next_at=None)


def test_set_manager_next_requires_assignee():
    occurrence = SimpleNamespace(
        id="occ-1",
        branch_id="br-1",
        assignee_user_id=None,
        status="pending",
    )
    svc, _ = _service(occurrence)
    with pytest.raises(ValueError, match="עובד"):
        svc.set_manager_next(_actor(), "occ-1", enabled=True)


def test_employee_cannot_set_manager_next():
    occurrence = SimpleNamespace(
        id="occ-1",
        branch_id="br-1",
        assignee_user_id="emp-1",
        status="pending",
    )
    svc, _ = _service(occurrence)
    with pytest.raises(PermissionError):
        svc.set_manager_next(_actor(role="employee", user_id="emp-1"), "occ-1", enabled=True)
