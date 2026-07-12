"""Traduction AI des tâches pour les employés."""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import re
from typing import Any

from app.domain.employee_language import (
    LANGUAGE_NAMES_EN,
    EmployeeLanguage,
    needs_translation,
    normalize_employee_language,
)
from app.repositories.task_translation_repository import TaskTranslationRepository
from app.services.ai.ai_client import AiError, generate_text

logger = logging.getLogger(__name__)


def _source_hash(title: str, description: str) -> str:
    payload = f"{title.strip()}|{(description or '').strip()}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _default_spoken_text(title: str, description: str) -> str:
    title = title.strip()
    description = (description or "").strip()
    if description:
        return f"{title}. {description}"
    return title


def _extract_json_array(text: str) -> list[dict]:
    raw = (text or "").strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
    if fence:
        raw = fence.group(1).strip()
    start = raw.find("[")
    end = raw.rfind("]")
    if start < 0 or end <= start:
        raise ValueError("לא ניתן לפרש את תשובת התרגום")
    payload = json.loads(raw[start : end + 1])
    if not isinstance(payload, list):
        raise ValueError("פורמט תרגום לא תקין")
    return [item for item in payload if isinstance(item, dict)]


def _build_batch_prompt(tasks: list[dict], language: EmployeeLanguage) -> str:
    lang_name = LANGUAGE_NAMES_EN[language]
    compact = [
        {
            "id": task["id"],
            "title": task.get("title") or "",
            "description": task.get("description") or "",
        }
        for task in tasks
    ]
    return f"""Translate supermarket employee tasks from Hebrew to {lang_name}.
Return ONLY a JSON array (no markdown). One object per task:
[
  {{"id":"same-id","title":"translated title","description":"translated description","spoken_text":"short natural sentence for text-to-speech in {lang_name}"}}
]

Rules:
- Keep ids unchanged
- spoken_text: one clear spoken instruction for the employee
- Use the target language only

Tasks:
{json.dumps(compact, ensure_ascii=False)}
"""


class TaskTranslationService:
    def __init__(self, repo: TaskTranslationRepository):
        self._repo = repo

    def apply_to_cards(
        self,
        cards: list[dict[str, Any]],
        *,
        language: str | None,
    ) -> list[dict[str, Any]]:
        """Liste rapide : cache uniquement, sans appel AI bloquant."""
        lang = normalize_employee_language(language)
        if not cards:
            return []
        if not needs_translation(lang):
            return [self._with_spoken_defaults(card, lang) for card in cards]
        compact = [
            {
                "id": card["id"],
                "title": card.get("title") or "",
                "description": card.get("description") or "",
            }
            for card in cards
        ]
        translated = self._from_cache_only(compact, lang)
        by_id = {str(card["id"]): card for card in translated}
        result: list[dict[str, Any]] = []
        for card in cards:
            merged = dict(card)
            hit = by_id.get(str(card["id"]))
            if hit:
                merged["title"] = hit["title"]
                merged["description"] = hit["description"]
                merged["spoken_text"] = hit.get("spoken_text") or _default_spoken_text(
                    hit["title"], hit["description"]
                )
                merged["display_language"] = lang
                merged["translation_pending"] = hit.get("translation_pending", False)
            else:
                merged = self._with_spoken_defaults(merged, lang)
                merged["translation_pending"] = True
            result.append(merged)
        return result

    def apply_to_occurrences(
        self,
        items: list[dict[str, Any]],
        *,
        language: str | None,
    ) -> list[dict[str, Any]]:
        lang = normalize_employee_language(language)
        if not items:
            return []
        if not needs_translation(lang):
            return [self._with_spoken_defaults(item, lang) for item in items]
        cards = [
            {
                "id": item["id"],
                "title": item.get("title") or "",
                "description": item.get("description") or "",
            }
            for item in items
        ]
        translated = self._from_cache_only(cards, lang)
        by_id = {card["id"]: card for card in translated}
        result: list[dict[str, Any]] = []
        for item in items:
            merged = dict(item)
            hit = by_id.get(item["id"])
            if hit:
                merged["title"] = hit["title"]
                merged["description"] = hit["description"]
                merged["spoken_text"] = hit.get("spoken_text") or _default_spoken_text(
                    hit["title"], hit["description"]
                )
                merged["display_language"] = lang
                merged["translation_pending"] = hit.get("translation_pending", False)
            else:
                merged = self._with_spoken_defaults(merged, lang)
                merged["translation_pending"] = True
            result.append(merged)
        return result

    async def translate_cards(
        self,
        cards: list[dict[str, Any]],
        *,
        language: str | None,
    ) -> list[dict[str, Any]]:
        """Traduction AI explicite (peut être lente) — endpoint dédié."""
        lang = normalize_employee_language(language)
        if not cards or not needs_translation(lang):
            return [self._with_spoken_defaults(card, lang) for card in cards]
        return await self._translate_missing(cards, lang)

    def _from_cache_only(
        self,
        cards: list[dict[str, Any]],
        language: EmployeeLanguage,
    ) -> list[dict[str, Any]]:
        ids = [str(card["id"]) for card in cards]
        cached = self._repo.get_many(ids, language)
        result: list[dict[str, Any]] = []
        for card in cards:
            occ_id = str(card["id"])
            title = str(card.get("title") or "")
            description = str(card.get("description") or "")
            digest = _source_hash(title, description)
            hit = cached.get(occ_id)
            if hit and hit.source_hash == digest:
                result.append(
                    {
                        "id": occ_id,
                        "title": hit.title,
                        "description": hit.description,
                        "spoken_text": hit.spoken_text,
                        "display_language": language,
                        "translation_pending": False,
                    }
                )
            else:
                row = self._with_spoken_defaults(card, language)
                row["translation_pending"] = True
                result.append(row)
        return result

    async def _translate_missing(
        self,
        cards: list[dict[str, Any]],
        language: EmployeeLanguage,
    ) -> list[dict[str, Any]]:
        ids = [str(card["id"]) for card in cards]
        cached = self._repo.get_many(ids, language)
        pending: list[dict[str, Any]] = []
        ready: dict[str, dict[str, Any]] = {}

        for card in cards:
            occ_id = str(card["id"])
            title = str(card.get("title") or "")
            description = str(card.get("description") or "")
            digest = _source_hash(title, description)
            hit = cached.get(occ_id)
            if hit and hit.source_hash == digest:
                ready[occ_id] = {
                    "id": occ_id,
                    "title": hit.title,
                    "description": hit.description,
                    "spoken_text": hit.spoken_text,
                    "display_language": language,
                    "translation_pending": False,
                }
            else:
                pending.append({"id": occ_id, "title": title, "description": description})

        if pending:
            try:
                fresh = await self._translate_batch(pending, language)
            except (AiError, ValueError) as exc:
                logger.warning("Task translation failed: %s", exc)
                for card in pending:
                    occ_id = str(card["id"])
                    row = self._with_spoken_defaults(card, language)
                    row["translation_pending"] = True
                    ready[occ_id] = row
            else:
                for item in fresh:
                    occ_id = str(item["id"])
                    title = str(item.get("title") or "")
                    description = str(item.get("description") or "")
                    spoken = str(item.get("spoken_text") or _default_spoken_text(title, description))
                    source = next(c for c in pending if str(c["id"]) == occ_id)
                    digest = _source_hash(source["title"], source["description"])
                    self._repo.upsert(
                        occurrence_id=occ_id,
                        language=language,
                        title=title,
                        description=description,
                        spoken_text=spoken,
                        source_hash=digest,
                    )
                    ready[occ_id] = {
                        "id": occ_id,
                        "title": title,
                        "description": description,
                        "spoken_text": spoken,
                        "display_language": language,
                        "translation_pending": False,
                    }

        result: list[dict[str, Any]] = []
        for card in cards:
            occ_id = str(card["id"])
            if occ_id in ready:
                result.append(ready[occ_id])
            else:
                row = self._with_spoken_defaults(card, language)
                row["translation_pending"] = True
                result.append(row)
        return result

    async def _translate_batch(
        self,
        tasks: list[dict[str, Any]],
        language: EmployeeLanguage,
    ) -> list[dict[str, Any]]:
        prompt = _build_batch_prompt(tasks, language)
        raw = await generate_text(
            prompt,
            system="You are a professional translator for supermarket staff tasks. Reply with JSON only.",
            for_generation=True,
        )
        parsed = _extract_json_array(raw)
        by_id = {str(item.get("id")): item for item in parsed if item.get("id")}
        result: list[dict[str, Any]] = []
        for task in tasks:
            occ_id = str(task["id"])
            hit = by_id.get(occ_id)
            if not hit:
                row = self._with_spoken_defaults(task, language)
                row["translation_pending"] = True
                result.append(row)
                continue
            title = str(hit.get("title") or task.get("title") or "").strip()
            if not title:
                row = self._with_spoken_defaults(task, language)
                row["translation_pending"] = True
                result.append(row)
                continue
            description = str(hit.get("description") or task.get("description") or "")
            spoken = str(hit.get("spoken_text") or _default_spoken_text(title, description))
            result.append(
                {
                    "id": occ_id,
                    "title": title,
                    "description": description,
                    "spoken_text": spoken,
                    "display_language": language,
                    "translation_pending": False,
                }
            )
        return result

    def _with_spoken_defaults(self, card: dict[str, Any], language: EmployeeLanguage) -> dict[str, Any]:
        merged = dict(card)
        title = str(merged.get("title") or "")
        description = str(merged.get("description") or "")
        merged["spoken_text"] = str(merged.get("spoken_text") or _default_spoken_text(title, description))
        merged["display_language"] = language
        return merged
