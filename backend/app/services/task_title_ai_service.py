"""Génération IA d'un titre de tâche à partir de la description."""
from __future__ import annotations

from app.domain.task_title_from_description import (
    build_title_from_description_prompt,
    build_title_from_description_system,
    fallback_title_from_description,
    parse_generated_title,
)
from app.services.ai.ai_client import AiError, generate_text


async def generate_title_from_description(
    description: str,
    *,
    manager_language: str = "he",
) -> str:
    cleaned = (description or "").strip()
    if not cleaned:
        raise ValueError("נדרש תיאור ליצירת כותרת")
    prompt = build_title_from_description_prompt(
        description=cleaned, manager_language=manager_language
    )
    system = build_title_from_description_system(manager_language=manager_language)
    try:
        raw = await generate_text(prompt, system=system, for_generation=True)
        return parse_generated_title(raw, description=cleaned)
    except AiError:
        return fallback_title_from_description(cleaned)
