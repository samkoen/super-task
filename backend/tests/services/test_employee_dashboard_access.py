"""Dashboard oved : menahel snif (oved du מנהל רשת) aussi."""
import asyncio
from unittest.mock import MagicMock

import pytest

from app.domain.scope import ActorContext
from app.services.dashboard_service import DashboardService


def _svc() -> DashboardService:
    occ = MagicMock()
    occ.list_occurrences.return_value = []
    occ.get_branch_name.return_value = "סניף"
    occ.expire_open_fixed_before.return_value = []
    users = MagicMock()
    users.find_by_id.return_value = MagicMock(
        full_name="מנהל",
        job_function=None,
        preferred_language="he",
        avatar_url=None,
    )
    return DashboardService(occ, MagicMock(), MagicMock(), users, MagicMock())


def test_branch_manager_can_open_employee_dashboard():
    actor = ActorContext(
        user_id="m1", role="branch_manager", network_id="n1", branch_id="b1"
    )
    data = asyncio.run(_svc().employee_dashboard(actor))
    assert data["employee"]["id"] == "m1"
    assert data["urgent_tasks"] == []


def test_network_manager_cannot_open_employee_dashboard():
    actor = ActorContext(user_id="nm", role="network_manager", network_id="n1")
    with pytest.raises(PermissionError):
        asyncio.run(_svc().employee_dashboard(actor))
