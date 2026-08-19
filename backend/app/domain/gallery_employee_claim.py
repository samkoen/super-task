"""Règles : l'oved se ramène une recette de galerie."""
from __future__ import annotations

from app.domain import roles, task_status
from app.domain.scope import ActorContext

CLAIMABLE_OPEN_STATUSES = frozenset(
    {
        task_status.PENDING,
        task_status.IN_PROGRESS,
        task_status.OVERDUE,
        task_status.AWAITING_RESPONSE,
    }
)


def gallery_item_claimable_by_employee(
    *,
    employee_can_claim: bool,
    item_network_id: str,
    item_branch_id: str | None,
    actor: ActorContext,
) -> bool:
    if actor.role != roles.EMPLOYEE or not employee_can_claim:
        return False
    if not actor.network_id or item_network_id != actor.network_id:
        return False
    if not actor.branch_id:
        return False
    if item_branch_id and item_branch_id != actor.branch_id:
        return False
    return True
