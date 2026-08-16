import uuid
from unittest.mock import MagicMock

import pytest

from app.models.user import User
from app.services.auth_service import AuthService


def _user(*, verified: bool = False) -> User:
    return User(
        id=str(uuid.uuid4()),
        email="test@example.com",
        first_name="Test",
        last_name="User",
        role="employee",
        email_verified=verified,
    )


def test_try_login_rejects_unverified():
    user = _user(verified=False)
    repo = MagicMock()
    repo.get_user_and_password_hash.return_value = (user, "hash")
    service = AuthService(repo)

    with pytest.MonkeyPatch.context() as mp:
        mp.setattr("app.services.auth_service.verify_password", lambda _p, _h: True)
        result, err = service.try_login("test@example.com", "secret")

    assert result is None
    assert err == "unverified"


def test_try_login_normalizes_phone_identifier():
    user = _user(verified=True)
    user.email = "0528716886"
    user.role = "admin"
    repo = MagicMock()
    repo.get_user_and_password_hash.return_value = (user, "hash")
    service = AuthService(repo)

    with pytest.MonkeyPatch.context() as mp:
        mp.setattr("app.services.auth_service.verify_password", lambda _p, _h: True)
        result, err = service.try_login("052-871-6886", "123456")

    assert err is None
    assert result is not None
    repo.get_user_and_password_hash.assert_called_once_with("0528716886")
