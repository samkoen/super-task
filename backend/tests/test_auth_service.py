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
