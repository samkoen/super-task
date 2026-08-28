from datetime import datetime
from unittest.mock import MagicMock

import pytest

from app.domain import roles
from app.services.employee_activity_service import EmployeeActivityService

UID = "11111111-1111-1111-1111-111111111111"


def _svc(row) -> EmployeeActivityService:
    users = MagicMock()
    users._db = MagicMock()
    users._db.get.return_value = row
    return EmployeeActivityService(users, MagicMock())


def test_branch_manager_can_set_break():
    row = MagicMock(role=roles.BRANCH_MANAGER, on_break_since=None)
    breaks = MagicMock()
    svc = _svc(row)
    svc._breaks = breaks
    result = svc.set_break(UID, on_break=True)
    assert result["on_break"] is True
    breaks.open_interval.assert_called_once()


def test_end_break_closes_open_interval():
    row = MagicMock(role=roles.EMPLOYEE, on_break_since=datetime.now())
    breaks = MagicMock()
    svc = _svc(row)
    svc._breaks = breaks
    svc._has_in_progress = MagicMock(return_value=True)
    result = svc.set_break(UID, on_break=False)
    assert result["on_break"] is False
    breaks.close_open.assert_called_once()


def test_network_manager_cannot_set_break():
    row = MagicMock(role=roles.NETWORK_MANAGER, on_break_since=None)
    with pytest.raises(PermissionError):
        _svc(row).set_break(UID, on_break=True)
