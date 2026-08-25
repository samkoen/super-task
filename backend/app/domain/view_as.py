"""Règles du mode test « צפייה כעובד »."""

from app.domain import roles

MANAGER_VIEW_AS_ROLES = {roles.ADMIN, roles.NETWORK_MANAGER, roles.BRANCH_MANAGER}


def can_view_as_employee(
    *,
    actor_role: str,
    visible_branch_ids: list[str] | None,
    target_role: str,
    target_is_active: bool,
    target_branch_ids: list[str],
) -> bool:
    if actor_role not in MANAGER_VIEW_AS_ROLES:
        return False
    if target_role != roles.EMPLOYEE or not target_is_active:
        return False
    branches = [b for b in target_branch_ids if b]
    if not branches:
        return False
    if visible_branch_ids is None:
        return True
    visible = set(visible_branch_ids)
    return any(bid in visible for bid in branches)


def attach_preview_meta(user: dict, real_user: dict) -> dict:
    payload = dict(user)
    payload["is_preview"] = True
    payload["preview_real_user"] = {
        "id": real_user["id"],
        "full_name": real_user.get("full_name") or "",
        "role": real_user["role"],
    }
    return payload
