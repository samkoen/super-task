import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest

from app.domain import invitation_status, job_functions, roles
from app.models.invitation import UserInvitation
from app.models.user import User
from app.services.invitation_service import InvitationService


def _invitation(*, status: str = invitation_status.PENDING) -> UserInvitation:
    expires = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    return UserInvitation(
        id=str(uuid.uuid4()),
        email="worker@example.com",
        role=roles.EMPLOYEE,
        job_function=job_functions.HEAD_CASHIER,
        network_id="network-1",
        branch_id="branch-1",
        invited_by_id=str(uuid.uuid4()),
        status=status,
        expires_at=expires,
    )


def test_create_invitation_requires_job_function_for_employee():
    invites = MagicMock()
    users = MagicMock()
    scope = MagicMock()
    service = InvitationService(invites, users, scope, MagicMock(), MagicMock())
    users.find_by_id.return_value = User(
        id="admin", email="a@t.com", first_name="A", last_name="B", role=roles.ADMIN
    )

    with pytest.raises(ValueError, match="יש לבחור תפקיד עובד"):
        service.create_invitation(
            inviter_id="admin",
            inviter_role=roles.ADMIN,
            email="x@test.com",
            role=roles.EMPLOYEE,
            job_function=None,
        )


def test_branch_manager_cannot_invite_network_manager():
    invites = MagicMock()
    users = MagicMock()
    scope = MagicMock()
    service = InvitationService(invites, users, scope, MagicMock(), MagicMock())

    with pytest.raises(ValueError, match="אין הרשאה"):
        service.create_invitation(
            inviter_id="mgr-id",
            inviter_role=roles.BRANCH_MANAGER,
            email="x@test.com",
            role=roles.NETWORK_MANAGER,
            job_function=None,
        )


def test_accept_invitation_creates_user_with_scope():
    inv = _invitation()
    invites = MagicMock()
    users = MagicMock()
    scope = MagicMock()
    invites.find_by_id.return_value = inv
    user = User(
        id="user-id",
        email=inv.email,
        first_name="A",
        last_name="B",
        role=roles.EMPLOYEE,
        network_id=inv.network_id,
        branch_id=inv.branch_id,
    )
    users.count_by_email.return_value = 0
    users.create_user.return_value = user
    service = InvitationService(invites, users, scope, MagicMock(), MagicMock())

    with pytest.MonkeyPatch.context() as mp:
        mp.setattr(
            "app.services.invitation_service.decode_invitation_token",
            lambda _t: inv.id,
        )
        result = service.accept_invitation(
            token="jwt",
            first_name="A",
            last_name="B",
            password="123456",
        )

    assert result["email"] == inv.email
    call_kw = users.create_user.call_args.kwargs
    assert call_kw["network_id"] == inv.network_id
    assert call_kw["branch_id"] == inv.branch_id
    invites.update_status.assert_called_once_with(inv.id, invitation_status.ACCEPTED)
