"""Titre de tâche dérivé de la description (prompt IA + repli)."""
from __future__ import annotations

import re

from app.domain.employee_language import LANGUAGE_NAMES_EN, normalize_employee_language

_MAX_TITLE_LEN = 80


def fallback_title_from_description(description: str, *, max_len: int = _MAX_TITLE_LEN) -> str:
    """Repli sans IA : première ligne / début de description, tronqué."""
    text = (description or "").strip()
    if not text:
        return ""
    first_line = text.splitlines()[0].strip()
    cleaned = re.sub(r"\s+", " ", first_line)
    if len(cleaned) <= max_len:
        return cleaned
    return cleaned[: max_len - 1].rstrip() + "…"


def resolve_create_title(title: str | None, description: str | None) -> str:
    """
    Titre final pour création.
    - titre saisi → conservé
    - sinon description → repli (l'IA côté API / front peut avoir déjà rempli le titre)
    """
    cleaned_title = (title or "").strip()
    if cleaned_title:
        return cleaned_title
    fallback = fallback_title_from_description(description or "")
    if not fallback:
        raise ValueError("נדרשת כותרת או תיאור למשימה")
    return fallback


def build_title_from_description_prompt(
    *, description: str, manager_language: str = "he"
) -> str:
    lang = normalize_employee_language(manager_language)
    lang_name = LANGUAGE_NAMES_EN[lang]
    return f"""You write a short supermarket task title from a manager's description.

Language: {lang_name}
Description:
\"\"\"{description.strip()}\"\"\"

Return ONLY the title text (no quotes, no JSON, no explanation).
Rules:
- 3 to 8 words when possible, max {_MAX_TITLE_LEN} characters
- Same language as the description / {lang_name}
- Operational style (what to do), no inventing details not in the description
- No trailing punctuation unless part of a name
"""


def build_title_from_description_system(*, manager_language: str = "he") -> str:
    lang = normalize_employee_language(manager_language)
    lang_name = LANGUAGE_NAMES_EN[lang]
    return (
        f"You create concise task titles in {lang_name} for supermarket staff. "
        "Output only the title."
    )


def parse_generated_title(raw: str | None, *, description: str) -> str:
    text = (raw or "").strip()
    text = text.strip("\"'`")
    text = re.sub(r"\s+", " ", text)
    if text.lower().startswith("title:"):
        text = text.split(":", 1)[1].strip()
    if len(text) > _MAX_TITLE_LEN:
        text = text[: _MAX_TITLE_LEN - 1].rstrip() + "…"
    if text:
        return text
    return fallback_title_from_description(description)
