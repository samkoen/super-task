"""Périmètre d'accès par rôle."""

from dataclasses import dataclass

from app.domain import roles


@dataclass(frozen=True)
class ActorContext:
    user_id: str
    role: str
    network_id: str | None = None
    branch_id: str | None = None


def can_manage_networks(actor: ActorContext) -> bool:
    return actor.role == roles.ADMIN


def can_manage_branches(actor: ActorContext) -> bool:
    return actor.role in {roles.ADMIN, roles.NETWORK_MANAGER, roles.BRANCH_MANAGER}


def can_manage_departments(actor: ActorContext) -> bool:
    return actor.role in {roles.ADMIN, roles.NETWORK_MANAGER, roles.BRANCH_MANAGER}


def assert_network_visible(actor: ActorContext, network_id: str) -> None:
    if actor.role == roles.ADMIN:
        return
    if actor.role == roles.NETWORK_MANAGER and actor.network_id == network_id:
        return
    raise PermissionError("אין הרשאה לרשת זו")


def assert_branch_visible(actor: ActorContext, branch_network_id: str, branch_id: str) -> None:
    if actor.role == roles.ADMIN:
        return
    if actor.role == roles.NETWORK_MANAGER and actor.network_id == branch_network_id:
        return
    if actor.role == roles.BRANCH_MANAGER and actor.branch_id == branch_id:
        return
    raise PermissionError("אין הרשאה לסניף זה")
