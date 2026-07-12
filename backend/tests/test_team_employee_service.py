import pytest
from unittest.mock import MagicMock

from app.domain import job_functions, roles
from app.domain.scope import ActorContext
from app.models.branch import Branch
from app.models.network import Network
from app.models.user import User
from app.services.user_scope_service import UserScopeService
from app.services.user_service import UserService


def _employee(**overrides):
    base = dict(
        id="e1",
        email="emp@test.com",
        first_name="Emp",
        last_name="One",
        role=roles.EMPLOYEE,
        network_id="r1",
        branch_id="s1",
        job_function=job_functions.HEAD_CASHIER,
        is_active=True,
    )
    base.update(overrides)
    return User(**base)


def _service(*, branch=None, network=None, branches=None):
    branch_repo = MagicMock()
    network_repo = MagicMock()
    branch_repo.find_by_id.return_value = branch
    network_repo.find_by_id.return_value = network
    branch_repo.list_branches.return_value = branches or []
    scope = UserScopeService(branch_repo, network_repo)
    return UserService(MagicMock(), scope, network_repo, branch_repo), branch_repo


def test_branch_manager_can_create_employee_in_own_branch():
    repo = MagicMock()
    repo.count_by_email.return_value = 0
    branch = Branch(id="s1", network_id="r1", name="Branch")
    service, _ = _service(branch=branch, network=Network(id="r1", name="Net"))
    service._repo = repo
    actor = ActorContext(
        user_id="bm1", role=roles.BRANCH_MANAGER, network_id="r1", branch_id="s1"
    )

    with pytest.MonkeyPatch.context() as mp:
        send_mock = MagicMock(return_value=True)
        mp.setattr("app.services.user_service.send_verification_email", send_mock)
        service.create_team_employee(
            actor,
            email="0501234567",
            password="123456",
            first_name="New",
            last_name="Emp",
            job_function=job_functions.STOCKERS,
        )

    call_kw = repo.create_user.call_args.kwargs
    assert call_kw["role"] == roles.EMPLOYEE
    assert call_kw["branch_id"] == "s1"
    assert call_kw["network_id"] == "r1"
    assert call_kw["email_verified"] is True
    send_mock.assert_not_called()


def test_branch_manager_create_uses_own_branch_even_if_other_specified():
    repo = MagicMock()
    repo.count_by_email.return_value = 0
    branch = Branch(id="s1", network_id="r1", name="Branch")
    service, _ = _service(branch=branch, network=Network(id="r1", name="Net"))
    service._repo = repo
    actor = ActorContext(
        user_id="bm1", role=roles.BRANCH_MANAGER, network_id="r1", branch_id="s1"
    )

    with pytest.MonkeyPatch.context() as mp:
        send_mock = MagicMock(return_value=True)
        mp.setattr("app.services.user_service.send_verification_email", send_mock)
        service.create_team_employee(
            actor,
            email="new@test.com",
            password="123456",
            first_name="New",
            last_name="Emp",
            job_function=job_functions.STOCKERS,
            branch_id="s2",
        )

    assert repo.create_user.call_args.kwargs["branch_id"] == "s1"


def test_team_employee_requires_identifier():
    service, _ = _service()
    service._repo = MagicMock()
    actor = ActorContext(
        user_id="bm1", role=roles.BRANCH_MANAGER, network_id="r1", branch_id="s1"
    )
    with pytest.raises(ValueError, match="נדרש מזהה"):
        service.create_team_employee(
            actor,
            email="  ",
            password="123456",
            first_name="New",
            last_name="Emp",
            job_function=job_functions.STOCKERS,
        )


def test_branch_manager_cannot_update_employee_in_other_branch():
    repo = MagicMock()
    employee = _employee(id="e1", branch_id="s2")
    repo.find_by_id.return_value = employee
    branch_s2 = Branch(id="s2", network_id="r1", name="Other")
    service, branch_repo = _service(branch=branch_s2)
    service._repo = repo
    branch_repo.find_by_id.return_value = branch_s2
    actor = ActorContext(
        user_id="bm1", role=roles.BRANCH_MANAGER, network_id="r1", branch_id="s1"
    )

    with pytest.raises(PermissionError):
        service.update_team_employee(
            actor,
            "e1",
            email="emp@test.com",
            first_name="Emp",
            last_name="One",
            job_function=job_functions.HEAD_CASHIER,
        )


def test_branch_manager_cannot_manage_non_employee():
    repo = MagicMock()
    repo.find_by_id.return_value = User(
        id="bm2",
        email="mgr@test.com",
        first_name="Mgr",
        last_name="Two",
        role=roles.BRANCH_MANAGER,
        network_id="r1",
        branch_id="s1",
    )
    branch = Branch(id="s1", network_id="r1", name="Branch")
    service, _ = _service(branch=branch)
    service._repo = repo
    actor = ActorContext(
        user_id="bm1", role=roles.BRANCH_MANAGER, network_id="r1", branch_id="s1"
    )

    with pytest.raises(PermissionError):
        service.update_team_employee(
            actor,
            "bm2",
            email="mgr@test.com",
            first_name="Mgr",
            last_name="Two",
            job_function=job_functions.HEAD_CASHIER,
        )


def test_network_manager_can_manage_employee_in_network_branch():
    repo = MagicMock()
    employee = _employee(id="e1", branch_id="s2")
    repo.find_by_id.return_value = employee
    repo.find_by_email.return_value = employee
    repo.update_employee.return_value = employee
    branch_s2 = Branch(id="s2", network_id="r1", name="Branch 2")
    service, branch_repo = _service(
        branch=branch_s2,
        network=Network(id="r1", name="Net"),
        branches=[Branch(id="s1", network_id="r1", name="B1"), branch_s2],
    )
    service._repo = repo
    branch_repo.find_by_id.return_value = branch_s2
    actor = ActorContext(user_id="nm1", role=roles.NETWORK_MANAGER, network_id="r1")

    result = service.update_team_employee(
        actor,
        "e1",
        email="emp@test.com",
        first_name="Emp",
        last_name="Updated",
        job_function=job_functions.WAREHOUSE_WORKER,
    )

    assert result["id"] == "e1"
    repo.update_employee.assert_called_once()


def test_network_manager_cannot_manage_employee_outside_network():
    repo = MagicMock()
    employee = _employee(id="e1", branch_id="s9", network_id="r9")
    repo.find_by_id.return_value = employee
    branch_s9 = Branch(id="s9", network_id="r9", name="Far")
    service, branch_repo = _service(
        branch=branch_s9,
        network=Network(id="r1", name="Net"),
        branches=[Branch(id="s1", network_id="r1", name="B1")],
    )
    service._repo = repo
    branch_repo.find_by_id.return_value = branch_s9
    actor = ActorContext(user_id="nm1", role=roles.NETWORK_MANAGER, network_id="r1")

    with pytest.raises(PermissionError):
        service.update_team_employee(
            actor,
            "e1",
            email="emp@test.com",
            first_name="Emp",
            last_name="One",
            job_function=job_functions.HEAD_CASHIER,
        )


def test_cannot_deactivate_self():
    repo = MagicMock()
    service, _ = _service()
    service._repo = repo
    actor = ActorContext(
        user_id="bm1", role=roles.BRANCH_MANAGER, network_id="r1", branch_id="s1"
    )

    with pytest.raises(ValueError, match="לא ניתן להשבית את עצמך"):
        service.set_team_employee_access(actor, "bm1", is_active=False)


def test_branch_manager_can_reactivate_employee():
    repo = MagicMock()
    employee = _employee(id="e1", is_active=False)
    repo.find_by_id.return_value = employee
    repo.set_active.return_value = _employee(id="e1", is_active=True)
    branch = Branch(id="s1", network_id="r1", name="Branch")
    service, _ = _service(branch=branch)
    service._repo = repo
    actor = ActorContext(
        user_id="bm1", role=roles.BRANCH_MANAGER, network_id="r1", branch_id="s1"
    )

    result = service.set_team_employee_access(actor, "e1", is_active=True)

    assert result["is_active"] is True
    repo.set_active.assert_called_once_with("e1", True)


def test_branch_manager_can_reset_employee_password():
    repo = MagicMock()
    employee = _employee(id="e1")
    repo.find_by_id.return_value = employee
    repo.update_password.return_value = employee
    branch = Branch(id="s1", network_id="r1", name="Branch")
    service, _ = _service(branch=branch)
    service._repo = repo
    actor = ActorContext(
        user_id="bm1", role=roles.BRANCH_MANAGER, network_id="r1", branch_id="s1"
    )

    service.reset_team_employee_password(actor, "e1", password="newpass123")

    repo.update_password.assert_called_once_with("e1", "newpass123")


def test_reset_password_rejects_short_password():
    repo = MagicMock()
    employee = _employee(id="e1")
    repo.find_by_id.return_value = employee
    branch = Branch(id="s1", network_id="r1", name="Branch")
    service, _ = _service(branch=branch)
    service._repo = repo
    actor = ActorContext(
        user_id="bm1", role=roles.BRANCH_MANAGER, network_id="r1", branch_id="s1"
    )

    with pytest.raises(ValueError, match="הסיסמה קצרה מדי"):
        service.reset_team_employee_password(actor, "e1", password="123")
