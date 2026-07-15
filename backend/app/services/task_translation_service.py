"""Traduction AI des tâches pour les employés."""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import re
from typing import Any

from app.core import config
from app.domain.employee_language import (
    LANGUAGE_NAMES_EN,
    EmployeeLanguage,
    needs_translation,
    normalize_employee_language,
)
from app.domain.google_cloud_languages import translate_source_code, translate_target_code
from app.repositories.task_translation_repository import TaskTranslationRepository
from app.services.ai.ai_client import AiError, generate_text
from app.services.google.google_cloud_errors import GoogleCloudError
from app.services.google.google_translate_client import is_configured as google_translate_configured
from app.services.google.google_translate_client import translate_texts

logger = logging.getLogger(__name__)


def _source_hash(title: str, description: str, source_language: str = "he") -> str:
    payload = f"{source_language.strip().lower()}|{title.strip()}|{(description or '').strip()}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _card_source_language(card: dict[str, Any]) -> EmployeeLanguage:
    raw = card.get("source_language") or config.GOOGLE_TRANSLATE_SOURCE or "he"
    return normalize_employee_language(str(raw))


def _default_spoken_text(title: str, description: str) -> str:
    title = title.strip()
    description = (description or "").strip()
    if description:
        return f"{title}. {description}"
    return title


def _preserve_hebrew_title(merged: dict[str, Any], source: dict[str, Any], language: EmployeeLanguage) -> None:
    if needs_translation(language):
        merged["title_he"] = str(source.get("title") or "")


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


def _build_batch_prompt(
    tasks: list[dict],
    language: EmployeeLanguage,
    source_language: EmployeeLanguage,
) -> str:
    lang_name = LANGUAGE_NAMES_EN[language]
    source_name = LANGUAGE_NAMES_EN[source_language]
    compact = [
        {
            "id": task["id"],
            "title": task.get("title") or "",
            "description": task.get("description") or "",
        }
        for task in tasks
    ]
    return f"""Translate supermarket employee tasks from {source_name} to {lang_name}.
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
                "source_language": card.get("source_language"),
            }
            for card in cards
        ]
        translated = self._from_cache_only(compact, lang)
        by_id = {str(card["id"]): card for card in translated}
        result: list[dict[str, Any]] = []
        for card in cards:
            merged = dict(card)
            _preserve_hebrew_title(merged, card, lang)
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
                "source_language": item.get("source_language"),
            }
            for item in items
        ]
        translated = self._from_cache_only(cards, lang)
        by_id = {card["id"]: card for card in translated}
        result: list[dict[str, Any]] = []
        for item in items:
            merged = dict(item)
            _preserve_hebrew_title(merged, item, lang)
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

    async def apply_to_cards_translated(
        self,
        cards: list[dict[str, Any]],
        *,
        language: str | None,
    ) -> list[dict[str, Any]]:
        localized = self.apply_to_cards(cards, language=language)
        return await self._finalize_pending_translations(localized, language=language)

    async def apply_to_occurrences_translated(
        self,
        items: list[dict[str, Any]],
        *,
        language: str | None,
    ) -> list[dict[str, Any]]:
        localized = self.apply_to_occurrences(items, language=language)
        return await self._finalize_pending_translations(localized, language=language)

    async def _finalize_pending_translations(
        self,
        cards: list[dict[str, Any]],
        *,
        language: str | None,
    ) -> list[dict[str, Any]]:
        lang = normalize_employee_language(language)
        if not cards or not needs_translation(lang):
            return cards
        pending = [card for card in cards if card.get("translation_pending")]
        if not pending:
            return cards
        compact = [
            {
                "id": card["id"],
                "title": card.get("title") or "",
                "description": card.get("description") or "",
                "source_language": card.get("source_language"),
            }
            for card in pending
        ]
        translated = await self.translate_cards(compact, language=language)
        by_id = {str(item["id"]): item for item in translated}
        result: list[dict[str, Any]] = []
        for card in cards:
            if not card.get("translation_pending"):
                result.append(card)
                continue
            hit = by_id.get(str(card["id"]))
            if not hit:
                result.append(card)
                continue
            merged = dict(card)
            merged["title"] = hit["title"]
            merged["description"] = hit["description"]
            merged["spoken_text"] = hit.get("spoken_text") or merged.get("spoken_text")
            merged["display_language"] = hit.get("display_language", lang)
            merged["translation_pending"] = hit.get("translation_pending", False)
            if hit.get("title_he"):
                merged["title_he"] = hit["title_he"]
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
            source_language = _card_source_language(card)
            digest = _source_hash(title, description, source_language)
            hit = cached.get(occ_id)
            if hit and hit.source_hash == digest:
                row = {
                    "id": occ_id,
                    "title": hit.title,
                    "description": hit.description,
                    "spoken_text": hit.spoken_text,
                    "display_language": language,
                    "translation_pending": False,
                }
                _preserve_hebrew_title(row, card, language)
                result.append(row)
            else:
                row = self._with_spoken_defaults(card, language)
                _preserve_hebrew_title(row, card, language)
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
            source_language = _card_source_language(card)
            digest = _source_hash(title, description, source_language)
            hit = cached.get(occ_id)
            if hit and hit.source_hash == digest:
                row = {
                    "id": occ_id,
                    "title": hit.title,
                    "description": hit.description,
                    "spoken_text": hit.spoken_text,
                    "display_language": language,
                    "translation_pending": False,
                }
                _preserve_hebrew_title(row, card, language)
                ready[occ_id] = row
            else:
                pending.append(
                    {
                        "id": occ_id,
                        "title": title,
                        "description": description,
                        "source_language": source_language,
                    }
                )

        if pending:
            try:
                if google_translate_configured():
                    fresh = await self._translate_batch_google(pending, language)
                else:
                    fresh = await self._translate_batch_ai(pending, language)
            except (AiError, GoogleCloudError, ValueError) as exc:
                logger.warning("Task translation failed: %s", exc)
                for card in pending:
                    occ_id = str(card["id"])
                    row = self._with_spoken_defaults(card, language)
                    _preserve_hebrew_title(row, card, language)
                    row["translation_pending"] = True
                    ready[occ_id] = row
            else:
                for item in fresh:
                    occ_id = str(item["id"])
                    title = str(item.get("title") or "")
                    description = str(item.get("description") or "")
                    spoken = str(item.get("spoken_text") or _default_spoken_text(title, description))
                    source = next(c for c in pending if str(c["id"]) == occ_id)
                    source_language = _card_source_language(source)
                    digest = _source_hash(source["title"], source["description"], source_language)
                    self._repo.upsert(
                        occurrence_id=occ_id,
                        language=language,
                        title=title,
                        description=description,
                        spoken_text=spoken,
                        source_hash=digest,
                    )
                    row = {
                        "id": occ_id,
                        "title": title,
                        "description": description,
                        "spoken_text": spoken,
                        "display_language": language,
                        "translation_pending": False,
                    }
                    _preserve_hebrew_title(row, source, language)
                    ready[occ_id] = row

        result: list[dict[str, Any]] = []
        for card in cards:
            occ_id = str(card["id"])
            if occ_id in ready:
                result.append(ready[occ_id])
            else:
                row = self._with_spoken_defaults(card, language)
                _preserve_hebrew_title(row, card, language)
                row["translation_pending"] = True
                result.append(row)
        return result

    async def _translate_batch_google(
        self,
        tasks: list[dict[str, Any]],
        language: EmployeeLanguage,
    ) -> list[dict[str, Any]]:
        grouped: dict[EmployeeLanguage, list[dict[str, Any]]] = {}
        for task in tasks:
            source_language = _card_source_language(task)
            grouped.setdefault(source_language, []).append(task)

        result: list[dict[str, Any]] = []
        for source_language, group in grouped.items():
            if source_language == language:
                for task in group:
                    row = self._with_spoken_defaults(task, language)
                    _preserve_hebrew_title(row, task, language)
                    row["translation_pending"] = False
                    result.append(row)
                continue

            target = translate_target_code(language)
            source = translate_source_code(source_language)
            fields: list[tuple[str, str]] = []
            texts: list[str] = []
            for task in group:
                occ_id = str(task["id"])
                fields.append((occ_id, "title"))
                texts.append(str(task.get("title") or ""))
                fields.append((occ_id, "description"))
                texts.append(str(task.get("description") or ""))

            translated = await translate_texts(texts, target=target, source=source)
            by_task: dict[str, dict[str, str]] = {}
            for (occ_id, field), value in zip(fields, translated, strict=True):
                by_task.setdefault(occ_id, {})[field] = value.strip()

            for task in group:
                occ_id = str(task["id"])
                hit = by_task.get(occ_id) or {}
                title = hit.get("title") or str(task.get("title") or "").strip()
                if not title:
                    row = self._with_spoken_defaults(task, language)
                    row["translation_pending"] = True
                    result.append(row)
                    continue
                description = hit.get("description") or str(task.get("description") or "")
                spoken = _default_spoken_text(title, description)
                row = {
                    "id": occ_id,
                    "title": title,
                    "description": description,
                    "spoken_text": spoken,
                    "display_language": language,
                    "translation_pending": False,
                }
                _preserve_hebrew_title(row, task, language)
                result.append(row)
        return result

    async def _translate_batch_ai(
        self,
        tasks: list[dict[str, Any]],
        language: EmployeeLanguage,
    ) -> list[dict[str, Any]]:
        grouped: dict[EmployeeLanguage, list[dict[str, Any]]] = {}
        for task in tasks:
            source_language = _card_source_language(task)
            grouped.setdefault(source_language, []).append(task)

        result: list[dict[str, Any]] = []
        for source_language, group in grouped.items():
            if source_language == language:
                for task in group:
                    row = self._with_spoken_defaults(task, language)
                    _preserve_hebrew_title(row, task, language)
                    row["translation_pending"] = False
                    result.append(row)
                continue

            prompt = _build_batch_prompt(group, language, source_language)
            raw = await generate_text(
                prompt,
                system="You are a professional translator for supermarket staff tasks. Reply with JSON only.",
                for_generation=True,
            )
            parsed = _extract_json_array(raw)
            by_id = {str(item.get("id")): item for item in parsed if item.get("id")}
            for task in group:
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
                row = {
                    "id": occ_id,
                    "title": title,
                    "description": description,
                    "spoken_text": spoken,
                    "display_language": language,
                    "translation_pending": False,
                }
                _preserve_hebrew_title(row, task, language)
                result.append(row)
        return result

    def _with_spoken_defaults(self, card: dict[str, Any], language: EmployeeLanguage) -> dict[str, Any]:
        merged = dict(card)
        title = str(merged.get("title") or "")
        description = str(merged.get("description") or "")
        merged["spoken_text"] = str(merged.get("spoken_text") or _default_spoken_text(title, description))
        merged["display_language"] = language
        return merged
