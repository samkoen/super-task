"""Tests AuthService multi-snif (snif actif)."""
from unittest.mock import MagicMock

import pytest

from app.domain import roles
from app.models.user import User
from app.services.auth_service import AuthService


def _employee(**kwargs) -> User:
    base = dict(
        id="u1",
        email="e@test.com",
        first_name="A",
        last_name="B",
        role=roles.EMPLOYEE,
        phone=None,
        job_function="stockers",
        network_id="n1",
        branch_id="b1",
        is_active=True,
        email_verified=True,
        preferred_language="he",
    )
    base.update(kwargs)
    return User(**base)


def test_set_active_branch_ok():
    repo = MagicMock()
    repo.find_by_id.return_value = _employee()
    repo._db = MagicMock()
    service = AuthService(repo)
    service._memberships = MagicMock()
    service._memberships.list_for_user.return_value = [
        {"branch_id": "b1", "branch_name": "א", "is_primary": True},
        {"branch_id": "b2", "branch_name": "ב", "is_primary": False},
    ]
    out = service.set_active_branch("u1", "b2")
    assert out["active_branch_id"] == "b2"
    assert out["branch_id"] == "b2"


def test_set_active_branch_rejects_non_member():
    repo = MagicMock()
    repo.find_by_id.return_value = _employee()
    repo._db = MagicMock()
    service = AuthService(repo)
    service._memberships = MagicMock()
    service._memberships.list_for_user.return_value = [
        {"branch_id": "b1", "branch_name": "א", "is_primary": True},
    ]
    with pytest.raises(PermissionError):
        service.set_active_branch("u1", "b9")


def test_set_active_branch_rejects_manager():
    repo = MagicMock()
    repo.find_by_id.return_value = _employee(role=roles.BRANCH_MANAGER)
    repo._db = MagicMock()
    service = AuthService(repo)
    with pytest.raises(ValueError, match="עובדים"):
        service.set_active_branch("u1", "b1")


def test_user_api_includes_network_name():
    from app.models.network import Network

    repo = MagicMock()
    repo.find_by_id.return_value = _employee(role=roles.BRANCH_MANAGER)
    repo._db = MagicMock()
    service = AuthService(repo)
    service._networks = MagicMock()
    service._networks.find_by_id.return_value = Network(id="n1", name="רשת בדיקה")
    out = service.get_user_by_id("u1")
    assert out is not None
    assert out["network_name"] == "רשת בדיקה"
