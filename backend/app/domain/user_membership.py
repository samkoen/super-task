"""Règles pures multi-snif (memberships + snif actif)."""
from __future__ import annotations


def resolve_active_branch_id(
    *,
    membership_branch_ids: list[str],
    primary_branch_id: str | None,
    requested_branch_id: str | None,
) -> str | None:
    """Snif courant : demandé s'il est membre, sinon primaire, sinon premier membership."""
    members = [b for b in membership_branch_ids if b]
    if not members:
        return primary_branch_id
    requested = (requested_branch_id or "").strip()
    if requested and requested in members:
        return requested
    primary = (primary_branch_id or "").strip()
    if primary and primary in members:
        return primary
    return members[0]


def membership_branch_ids_unique(branch_ids: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for bid in branch_ids:
        b = (bid or "").strip()
        if not b or b in seen:
            continue
        seen.add(b)
        out.append(b)
    return out


def employee_belongs_to_branch(
    *,
    primary_branch_id: str | None,
    membership_branch_ids: list[str],
    branch_id: str,
) -> bool:
    """True si le snif est primaire ou parmi les memberships."""
    bid = (branch_id or "").strip()
    if not bid:
        return False
    if (primary_branch_id or "").strip() == bid:
        return True
    return bid in membership_branch_ids
