"""Qui peut être assigné à une tâche d'un snif."""
from app.domain import roles
from app.domain.user_membership import employee_belongs_to_branch


def can_assign_user_to_branch(
    user,
    *,
    branch_id: str,
    membership_branch_ids: list[str],
    branch_network_id: str | None,
) -> bool:
    role = getattr(user, "role", None)
    if role == roles.BRANCH_MANAGER:
        return getattr(user, "branch_id", None) == branch_id
    if role == roles.NETWORK_MANAGER:
        net = getattr(user, "network_id", None)
        return bool(net and branch_network_id and net == branch_network_id)
    if role != roles.EMPLOYEE:
        return False
    return employee_belongs_to_branch(
        primary_branch_id=getattr(user, "branch_id", None),
        membership_branch_ids=membership_branch_ids,
        branch_id=branch_id,
    )
