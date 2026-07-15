"""Langue source d'une tâche pour la traduction employé."""
from __future__ import annotations

from app.core import config
from app.domain.employee_language import normalize_employee_language
from app.models.task_occurrence import TaskOccurrence
from app.repositories.user_repository import UserRepository


def task_source_language(occurrence: TaskOccurrence, users: UserRepository) -> str:
    author_id = occurrence.created_by_id or occurrence.manager_user_id
    if author_id:
        author = users.find_by_id(author_id)
        if author and author.preferred_language:
            return normalize_employee_language(author.preferred_language)
    return normalize_employee_language(config.GOOGLE_TRANSLATE_SOURCE or "he")
