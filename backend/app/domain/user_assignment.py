"""Rattachement utilisateur ↔ רשת / סניף."""

from dataclasses import dataclass

from app.domain import roles


@dataclass(frozen=True)
class UserScope:
    network_id: str | None
    branch_id: str | None


def resolve_user_scope(
    role: str,
    *,
    network_id: str | None,
    branch_id: str | None,
    branch_network_id: str | None = None,
) -> UserScope:
    if role == roles.ADMIN:
        return UserScope(None, None)
    if role == roles.NETWORK_MANAGER:
        if not network_id:
            raise ValueError("נדרש לבחור רשת")
        if branch_id:
            raise ValueError("מנהל רשת אינו משויך לסניף")
        return UserScope(network_id, None)
    if role in {roles.BRANCH_MANAGER, roles.EMPLOYEE}:
        if not branch_id:
            raise ValueError("נדרש לבחור סניף")
        if not branch_network_id:
            raise ValueError("סניף לא נמצא")
        return UserScope(branch_network_id, branch_id)
    raise ValueError("תפקיד לא תקין")


def apply_inviter_defaults(
    role: str,
    *,
    network_id: str | None,
    branch_id: str | None,
    inviter_role: str,
    inviter_network_id: str | None,
    inviter_branch_id: str | None,
) -> tuple[str | None, str | None]:
    if inviter_role == roles.BRANCH_MANAGER and role == roles.EMPLOYEE:
        return inviter_network_id, inviter_branch_id
    if inviter_role == roles.NETWORK_MANAGER and role in {roles.BRANCH_MANAGER, roles.EMPLOYEE}:
        if not branch_id:
            raise ValueError("נדרש לבחור סניף")
        return inviter_network_id, branch_id
    return network_id, branch_id


def assert_branch_in_inviter_network(
    branch_network_id: str,
    inviter_role: str,
    inviter_network_id: str | None,
) -> None:
    if inviter_role != roles.NETWORK_MANAGER:
        return
    if inviter_network_id != branch_network_id:
        raise PermissionError("הסניף אינו שייך לרשת שלך")
