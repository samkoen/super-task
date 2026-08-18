"""Helpers purs — tâche קבועה déployée sur tout le réseau."""
from __future__ import annotations

from collections import defaultdict

from app.domain import roles
from app.models.user import User


def pick_first_employee(employees: list[User]) -> User | None:
    """Premier oved actif du snif : plus ancien created_at, puis id."""
    active = [u for u in employees if u.is_active]
    if not active:
        return None
    return min(active, key=lambda u: (u.created_at or "", u.id))


def can_edit_network_fixed_group(role: str) -> bool:
    return role in {roles.NETWORK_MANAGER, roles.ADMIN}


def content_key(template) -> tuple:
    return (
        (getattr(template, "title", None) or "").strip(),
        (getattr(template, "description", None) or "").strip(),
        getattr(template, "recurrence", None),
        getattr(template, "due_time", None),
        getattr(template, "weekly_days", None) or "",
        getattr(template, "monthly_day", None),
    )


def grouped_network_ids(templates: list) -> set[str]:
    """IDs liés : network_group_id, ou même contenu sur au moins 2 snifim."""
    ids = {t.id for t in templates if getattr(t, "network_group_id", None)}
    buckets: dict[tuple, list] = defaultdict(list)
    for t in templates:
        buckets[content_key(t)].append(t)
    for group in buckets.values():
        if len({g.branch_id for g in group}) >= 2:
            ids.update(g.id for g in group)
    return ids


def siblings_by_content(existing, candidates: list) -> list:
    key = content_key(existing)
    found = [t for t in candidates if content_key(t) == key]
    if len({t.branch_id for t in found}) >= 2:
        return found
    return [existing]


def occurrence_content_key(occurrence) -> tuple:
    return (
        (getattr(occurrence, "title", None) or "").strip(),
        (getattr(occurrence, "description", None) or "").strip(),
        getattr(occurrence, "due_at", None) or "",
    )


def grouped_occurrence_ids(occurrences: list) -> set[str]:
    """IDs מזדמנות liés : network_group_id, ou même contenu sur ≥ 2 snifim."""
    ad_hoc = [o for o in occurrences if getattr(o, "task_kind", None) == "ad_hoc"]
    ids = {o.id for o in ad_hoc if getattr(o, "network_group_id", None)}
    buckets: dict[tuple, list] = defaultdict(list)
    for o in ad_hoc:
        buckets[occurrence_content_key(o)].append(o)
    for group in buckets.values():
        if len({g.branch_id for g in group}) >= 2:
            ids.update(g.id for g in group)
    return ids


def siblings_by_occurrence_content(existing, candidates: list) -> list:
    key = occurrence_content_key(existing)
    found = [o for o in candidates if occurrence_content_key(o) == key]
    if len({o.branch_id for o in found}) >= 2:
        return found
    return [existing]


def select_network_create_branches(visible: list, selected_ids: list[str] | None) -> list:
    """None / liste vide = tous les snifim visibles ; sinon sous-ensemble autorisé."""
    if not selected_ids:
        return list(visible)
    wanted = list(dict.fromkeys(i for i in selected_ids if i))
    by_id = {b.id: b for b in visible}
    if any(i not in by_id for i in wanted):
        raise PermissionError("אין הרשאה לסניף זה")
    return [by_id[i] for i in wanted]
