import pytest
from unittest.mock import MagicMock

from app.domain import roles
from app.models.branch import Branch
from app.models.network import Network
from app.services.user_scope_service import UserScopeService
from app.services.user_service import UserService


def _service(branch=None, network=None):
    branch_repo = MagicMock()
    network_repo = MagicMock()
    branch_repo.find_by_id.return_value = branch
    network_repo.find_by_id.return_value = network
    scope = UserScopeService(branch_repo, network_repo)
    return UserService(MagicMock(), scope, network_repo, branch_repo)


def test_create_user_rejects_admin_role():
    repo = MagicMock()
    repo.count_by_email.return_value = 0
    service = _service()
    service._repo = repo

    with pytest.raises(ValueError, match="תפקיד לא מורשה"):
        service.create_user(
            email="x@test.com",
            password="123456",
            first_name="A",
            last_name="B",
            role=roles.ADMIN,
        )


def test_create_user_rejects_employee_role():
    repo = MagicMock()
    repo.count_by_email.return_value = 0
    service = _service()
    service._repo = repo

    with pytest.raises(ValueError, match="תפקיד לא מורשה"):
        service.create_user(
            email="x@test.com",
            password="123456",
            first_name="A",
            last_name="B",
            role=roles.EMPLOYEE,
        )


def test_create_branch_manager_requires_branch():
    repo = MagicMock()
    repo.count_by_email.return_value = 0
    branch = Branch(id="s1", network_id="r1", name="Branch")
    service = _service(branch=branch, network=Network(id="r1", name="Net"))
    service._repo = repo

    with pytest.MonkeyPatch.context() as mp:
        mp.setattr("app.services.user_service.send_verification_email", lambda *a, **k: True)
        service.create_user(
            email="new@test.com",
            password="123456",
            first_name="A",
            last_name="B",
            role=roles.BRANCH_MANAGER,
            branch_id="s1",
        )

    call_kw = repo.create_user.call_args.kwargs
    assert call_kw["branch_id"] == "s1"
    assert call_kw["network_id"] == "r1"
