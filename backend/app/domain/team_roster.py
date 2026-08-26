"""Roster עובדים : pour le מנהל רשת, les menahelim de snif sont aussi des ovdim."""
from app.domain import job_functions, roles


def worker_roles_for_roster(actor_role: str) -> tuple[str, ...]:
    if actor_role == roles.NETWORK_MANAGER:
        return (roles.EMPLOYEE, roles.BRANCH_MANAGER)
    return (roles.EMPLOYEE,)


def effective_job_function(role: str, job_function: str | None) -> str | None:
    if role == roles.BRANCH_MANAGER:
        return job_functions.BRANCH_MANAGER
    return job_function
