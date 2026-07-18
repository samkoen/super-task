"""Règles pures pour la galerie de tâches."""
from __future__ import annotations

from app.domain import roles
from app.domain.scope import ActorContext

GALLERY_KINDS = frozenset({"fixed", "ad_hoc"})


def gallery_item_visible(
    *,
    actor: ActorContext,
    item_network_id: str,
    item_branch_id: str | None,
    visible_branch_ids: list[str] | None,
) -> bool:
    """visible_branch_ids=None → admin (tout)."""
    if actor.role == roles.ADMIN:
        return True
    if not actor.network_id or item_network_id != actor.network_id:
        return False
    if item_branch_id is None:
        return True
    if visible_branch_ids is None:
        return True
    return item_branch_id in visible_branch_ids


def resolve_gallery_network_id(actor: ActorContext) -> str:
    if not actor.network_id:
        raise ValueError("נדרש רשת ליצירת פריט גלריה")
    return actor.network_id


def resolve_gallery_branch_id(
    actor: ActorContext, requested_branch_id: str | None
) -> str | None:
    """Branch manager : forcé sur son snif. Network/admin : optionnel."""
    if actor.role == roles.BRANCH_MANAGER:
        if not actor.branch_id:
            raise ValueError("מנהל סניף ללא סניף")
        return actor.branch_id
    return (requested_branch_id or "").strip() or None
