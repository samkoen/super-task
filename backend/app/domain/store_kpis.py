"""Calcul des KPI duals (report terrain / approbation menahel) pour le dashboard."""
from __future__ import annotations

from app.domain import ops_category, task_status
from app.models.task_occurrence import TaskOccurrence


def _pct(numerator: int, denominator: int) -> int:
    if denominator <= 0:
        return 0
    return round(numerator * 100 / denominator)


def compute_category_kpi(tasks: list[TaskOccurrence], category: str) -> dict:
    """KPI pour une catégorie sur la journée (hors cancelled).

    - report_pct : (pending_review + completed) / total
    - approval_pct : completed / total  (chiffre central)
    """
    scoped = [
        t
        for t in tasks
        if t.ops_category == category and t.status != task_status.CANCELLED
    ]
    total = len(scoped)
    approved = sum(1 for t in scoped if t.status == task_status.COMPLETED)
    reported = sum(
        1
        for t in scoped
        if t.status in {task_status.PENDING_REVIEW, task_status.COMPLETED}
    )
    return {
        "category": category,
        "total": total,
        "reported": reported,
        "approved": approved,
        "report_pct": _pct(reported, total),
        "approval_pct": _pct(approved, total),
    }


def build_store_kpis(tasks: list[TaskOccurrence]) -> dict:
    """Agrégats KPI magasin pour le dashboard manager."""
    return {
        "cleaning": compute_category_kpi(tasks, ops_category.CLEANING),
        "fronts_signage": compute_category_kpi(tasks, ops_category.FRONTS_SIGNAGE),
    }
