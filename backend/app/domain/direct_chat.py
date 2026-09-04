"""Règles pures du chat hors tâche (oved ↔ snif, menahel ↔ רשת)."""
from __future__ import annotations

from app.domain import roles
from app.domain.scope import ActorContext

SCOPE_BRANCH = "branch"
SCOPE_NETWORK = "network"
KIND_DOWN = "down"
KIND_UP = "up"
MAX_BODY = 2000


def downward_scope(actor: ActorContext) -> tuple[str, str] | None:
    if actor.role == roles.BRANCH_MANAGER and actor.branch_id:
        return SCOPE_BRANCH, actor.branch_id
    if actor.role == roles.NETWORK_MANAGER and actor.network_id:
        return SCOPE_NETWORK, actor.network_id
    return None


def upward_scope(actor: ActorContext) -> tuple[str, str] | None:
    if actor.role == roles.EMPLOYEE and actor.branch_id:
        return SCOPE_BRANCH, actor.branch_id
    if actor.role == roles.BRANCH_MANAGER and actor.network_id:
        return SCOPE_NETWORK, actor.network_id
    return None


def counterpart_role_for_scope(scope: str) -> str:
    if scope == SCOPE_BRANCH:
        return roles.EMPLOYEE
    return roles.BRANCH_MANAGER


def counterpart_roles_for_scope(scope: str, manages_all_workers: bool = False) -> frozenset[str]:
    if scope == SCOPE_BRANCH:
        return frozenset({roles.EMPLOYEE})
    if manages_all_workers:
        return frozenset({roles.BRANCH_MANAGER, roles.EMPLOYEE})
    return frozenset({roles.BRANCH_MANAGER})


def sort_downward_peers(users: list) -> list:
    rank = {roles.BRANCH_MANAGER: 0, roles.EMPLOYEE: 1}
    return sorted(users, key=lambda u: (rank.get(u.role, 9), (u.full_name or "").lower()))


def is_scope_manager(actor: ActorContext, scope: str, scope_id: str) -> bool:
    if scope == SCOPE_BRANCH:
        return actor.role == roles.BRANCH_MANAGER and actor.branch_id == scope_id
    if scope == SCOPE_NETWORK:
        return actor.role == roles.NETWORK_MANAGER and actor.network_id == scope_id
    return False


def employee_can_join_network_thread(
    actor: ActorContext,
    *,
    scope: str,
    scope_id: str,
    manages_all_workers: bool,
) -> bool:
    if not manages_all_workers or scope != SCOPE_NETWORK:
        return False
    return actor.role == roles.EMPLOYEE and actor.network_id == scope_id


def can_access_conversation(
    actor: ActorContext,
    *,
    scope: str,
    scope_id: str,
    counterpart_user_id: str,
    manages_all_workers: bool = False,
) -> bool:
    if actor.user_id == counterpart_user_id:
        if upward_scope(actor) == (scope, scope_id):
            return True
        return employee_can_join_network_thread(
            actor, scope=scope, scope_id=scope_id, manages_all_workers=manages_all_workers
        )
    return is_scope_manager(actor, scope, scope_id)


def notify_recipient_ids(
    *,
    sender_id: str,
    counterpart_user_id: str,
    manager_ids: list[str],
) -> set[str]:
    """Boîte partagée : managers du scope, ou l'oved/menahel en face."""
    if sender_id == counterpart_user_id:
        return {mid for mid in manager_ids if mid and mid != sender_id}
    return {counterpart_user_id} if counterpart_user_id != sender_id else set()


def message_preview(
    body: str | None,
    photo_url: str | None,
    video_url: str | None,
    audio_url: str | None,
    file_url: str | None = None,
) -> str:
    text = (body or "").strip()
    if text:
        return text[:80]
    if (photo_url or "").strip():
        return "📷"
    if (video_url or "").strip():
        return "🎥"
    if (audio_url or "").strip():
        return "🎤"
    if (file_url or "").strip():
        return "📎"
    return ""


def clip_body(body: str | None) -> str | None:
    text = (body or "").strip()
    if not text:
        return None
    if len(text) > MAX_BODY:
        raise ValueError("ההודעה ארוכה מדי")
    return text
