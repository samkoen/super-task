"""Tests AuthService — profil + mot de passe self-service."""
from unittest.mock import MagicMock

import pytest

from app.domain import roles
from app.models.user import User
from app.services.auth_service import AuthService


def _user(**kwargs) -> User:
    base = dict(
        id="u1",
        email="mgr@test.com",
        first_name="Mena",
        last_name="Hel",
        role=roles.BRANCH_MANAGER,
        phone="050",
        job_function=None,
        network_id="n1",
        branch_id="b1",
        is_active=True,
        email_verified=True,
        preferred_language="he",
    )
    base.update(kwargs)
    return User(**base)


def test_update_me_ok():
    repo = MagicMock()
    repo.find_by_id.return_value = _user()
    repo.find_by_email.return_value = None
    repo.update_profile.return_value = _user(first_name="New", last_name="Name", phone="052")
    repo._db = MagicMock()
    service = AuthService(repo)
    out = service.update_me(
        "u1",
        first_name="New",
        last_name="Name",
        phone="052",
        email="mgr@test.com",
    )
    assert out["first_name"] == "New"
    repo.update_profile.assert_called_once()


def test_update_me_rejects_taken_email():
    repo = MagicMock()
    repo.find_by_id.return_value = _user()
    repo.find_by_email.return_value = _user(id="other", email="taken@test.com")
    repo._db = MagicMock()
    service = AuthService(repo)
    with pytest.raises(ValueError, match="כבר קיים"):
        service.update_me(
            "u1",
            first_name="A",
            last_name="B",
            email="taken@test.com",
        )


def test_change_password_ok(monkeypatch):
    repo = MagicMock()
    repo.find_by_id.return_value = _user()
    repo.get_user_and_password_hash.return_value = (_user(), "hash")
    repo._db = MagicMock()
    service = AuthService(repo)
    monkeypatch.setattr("app.services.auth_service.verify_password", lambda p, h: p == "oldpass")
    service.change_password("u1", current_password="oldpass", new_password="newpass1")
    repo.update_password.assert_called_once_with("u1", "newpass1")


def test_change_password_wrong_current(monkeypatch):
    repo = MagicMock()
    repo.find_by_id.return_value = _user()
    repo.get_user_and_password_hash.return_value = (_user(), "hash")
    repo._db = MagicMock()
    service = AuthService(repo)
    monkeypatch.setattr("app.services.auth_service.verify_password", lambda p, h: False)
    with pytest.raises(PermissionError):
        service.change_password("u1", current_password="bad", new_password="newpass1")
