"""Règles : l'oved se ramène une recette de galerie."""
from __future__ import annotations

from app.domain import task_status
from app.domain.scope import ActorContext
from app.domain.task_scope import can_use_employee_work_surface

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
    if not can_use_employee_work_surface(actor) or not employee_can_claim:
        return False
    if not actor.network_id or item_network_id != actor.network_id:
        return False
    if not actor.branch_id:
        return False
    if item_branch_id and item_branch_id != actor.branch_id:
        return False
    return True
