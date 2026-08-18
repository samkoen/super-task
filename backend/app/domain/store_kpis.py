"""Calcul des KPI duals (report terrain / approbation menahel) pour le dashboard."""
from __future__ import annotations

from app.domain import ops_category, task_status
from app.models.task_occurrence import TaskOccurrence


def _pct(numerator: int, denominator: int) -> int:
    if denominator <= 0:
        return 0
    return round(numerator * 100 / denominator)


def _kpi_from_scoped(scoped: list[TaskOccurrence], category: str) -> dict:
    total = len(scoped)
    approved = sum(1 for t in scoped if t.status == task_status.COMPLETED)
    reported = sum(
        1
        for t in scoped
        if t.status in {task_status.PENDING_REVIEW, task_status.COMPLETED}
    )
    remaining = sum(1 for t in scoped if t.status != task_status.COMPLETED)
    return {
        "category": category,
        "total": total,
        "reported": reported,
        "approved": approved,
        "remaining": remaining,
        "report_pct": _pct(reported, total),
        "approval_pct": _pct(approved, total),
        "open_pct": _pct(remaining, total),
    }


def compute_category_kpi(tasks: list[TaskOccurrence], category: str) -> dict:
    """KPI pour une catégorie sur la journée (hors cancelled)."""
    scoped = [
        t
        for t in tasks
        if t.ops_category == category and t.status != task_status.CANCELLED
    ]
    return _kpi_from_scoped(scoped, category)


def compute_overall_kpi(tasks: list[TaskOccurrence]) -> dict:
    """KPI מצב כללי : toutes les tâches du jour (hors cancelled)."""
    scoped = [t for t in tasks if t.status != task_status.CANCELLED]
    return _kpi_from_scoped(scoped, "general")


def build_store_kpis(tasks: list[TaskOccurrence]) -> dict:
    """Agrégats KPI magasin pour le dashboard manager."""
    return {
        "general": compute_overall_kpi(tasks),
        "cleaning": compute_category_kpi(tasks, ops_category.CLEANING),
        "fronts_signage": compute_category_kpi(tasks, ops_category.FRONTS_SIGNAGE),
        "orders": compute_category_kpi(tasks, ops_category.ORDERS),
        "info_collection": compute_category_kpi(tasks, ops_category.INFO_COLLECTION),
    }
