"""Ordre d'affichage des tâches oved : en cours, sinon next menahel, sinon plus en retard."""

from __future__ import annotations


def sort_in_progress_focus_first(tasks: list) -> list:
    """Tâche en cours la plus récemment démarrée en tête, puis due_at croissant."""
    by_due = sorted(tasks, key=lambda t: getattr(t, "due_at", None) or "")
    return sorted(by_due, key=lambda t: getattr(t, "started_at", None) or "", reverse=True)


def sort_most_overdue_first(tasks: list) -> list:
    """Plus en retard = due_at le plus ancien en tête."""
    return sorted(tasks, key=lambda t: getattr(t, "due_at", None) or "")


def sort_employee_open_focus(tasks: list, *, has_in_progress: bool) -> list:
    """
    Sans tâche בטיפול : next menahel d'abord, puis plus en retard.
    Avec בטיפול : uniquement plus en retard (l'en cours est dans une autre liste).
    """
    if has_in_progress:
        return sort_most_overdue_first(tasks)
    next_tasks = [t for t in tasks if getattr(t, "manager_next_at", None)]
    rest = [t for t in tasks if not getattr(t, "manager_next_at", None)]
    next_sorted = sorted(
        next_tasks,
        key=lambda t: getattr(t, "manager_next_at", None) or "",
        reverse=True,
    )
    return next_sorted + sort_most_overdue_first(rest)
