from app.domain import job_functions, roles
from app.domain.team_roster import effective_job_function, worker_roles_for_roster


def test_network_manager_roster_includes_snif_menahelim():
    assert worker_roles_for_roster(roles.NETWORK_MANAGER) == (
        roles.EMPLOYEE,
        roles.BRANCH_MANAGER,
    )


def test_branch_manager_roster_is_ovdim_only():
    assert worker_roles_for_roster(roles.BRANCH_MANAGER) == (roles.EMPLOYEE,)
    assert worker_roles_for_roster(roles.ADMIN) == (roles.EMPLOYEE,)


def test_effective_job_function_for_snif_menahel():
    assert effective_job_function(roles.BRANCH_MANAGER, None) == job_functions.BRANCH_MANAGER
    assert (
        effective_job_function(roles.EMPLOYEE, job_functions.STOCKERS)
        == job_functions.STOCKERS
    )
