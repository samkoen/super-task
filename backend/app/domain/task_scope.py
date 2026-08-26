"""Périmètre et permissions sur les tâches."""

from app.domain import roles
from app.domain.scope import ActorContext, assert_branch_visible


def can_manage_tasks(actor: ActorContext) -> bool:
    return actor.role in {roles.ADMIN, roles.NETWORK_MANAGER, roles.BRANCH_MANAGER}


def can_use_employee_work_surface(actor: ActorContext) -> bool:
    """Oved, ou menahel snif qui est aussi oved du מנהל רשת."""
    if actor.role == roles.EMPLOYEE:
        return True
    return actor.role == roles.BRANCH_MANAGER and bool(actor.branch_id)


def visible_branch_ids_for_tasks(actor: ActorContext, branch_repo) -> list[str] | None:
    if actor.role == roles.ADMIN:
        return None
    if actor.role == roles.NETWORK_MANAGER and actor.network_id:
        return [s.id for s in branch_repo.list_branches(network_id=actor.network_id)]
    if actor.role == roles.BRANCH_MANAGER and actor.branch_id:
        return [actor.branch_id]
    if actor.role == roles.EMPLOYEE:
        # Écran filtré sur le snif actif (pas tous les memberships mélangés).
        if actor.branch_id:
            return [actor.branch_id]
        return []
    return []


def assert_branch_task_access(actor: ActorContext, branch_network_id: str, branch_id: str) -> None:
    assert_branch_visible(actor, branch_network_id, branch_id)


def employee_can_see_occurrence(actor: ActorContext, *, assignee_user_id: str | None, branch_id: str) -> bool:
    if not can_use_employee_work_surface(actor):
        return False
    if actor.branch_id != branch_id:
        return False
    return bool(assignee_user_id and assignee_user_id == actor.user_id)


def branch_manager_owns_delegation(actor: ActorContext, *, manager_user_id: str | None) -> bool:
    return actor.role == roles.BRANCH_MANAGER and manager_user_id == actor.user_id


def can_review_assigned_work(actor: ActorContext, *, assignee_user_id: str | None) -> bool:
    """Un menahel ne peut pas valider sa propre soumission oved."""
    if not can_manage_tasks(actor):
        return False
    if assignee_user_id and assignee_user_id == actor.user_id:
        return False
    return True
