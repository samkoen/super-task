"""Tests traduction Google dans TaskTranslationService."""
from __future__ import annotations

import asyncio

from app.services.task_translation_service import TaskTranslationService, _source_hash


class _FakeRepo:
    def __init__(self):
        self.rows: dict[tuple[str, str], dict] = {}

    def get_many(self, occurrence_ids, language):
        return {}

    def upsert(self, **kwargs):
        key = (kwargs["occurrence_id"], kwargs["language"])
        self.rows[key] = dict(kwargs)


def test_translate_batch_google_uses_card_source_language(monkeypatch):
    async def fake_translate(texts, *, target, source):
        assert target == "ar"
        assert source == "fr"
        return ["مهمة", "تفاصيل"]

    monkeypatch.setattr("app.services.task_translation_service.google_translate_configured", lambda: True)
    monkeypatch.setattr("app.services.task_translation_service.translate_texts", fake_translate)

    service = TaskTranslationService(_FakeRepo())  # type: ignore[arg-type]
    result = asyncio.run(
        service._translate_batch_google(
            [
                {
                    "id": "t1",
                    "title": "Tâche",
                    "description": "Détails",
                    "source_language": "fr",
                }
            ],
            "ar",
        )
    )
    assert result[0]["title"] == "مهمة"
    assert result[0]["title_he"] == "Tâche"


def test_translate_batch_google_hebrew_source_by_default(monkeypatch):
    async def fake_translate(texts, *, target, source):
        assert target == "ar"
        assert source == "he"
        return ["مهمة", "تفاصيل"]

    monkeypatch.setattr("app.services.task_translation_service.google_translate_configured", lambda: True)
    monkeypatch.setattr("app.services.task_translation_service.translate_texts", fake_translate)

    service = TaskTranslationService(_FakeRepo())  # type: ignore[arg-type]
    result = asyncio.run(
        service._translate_batch_google(
            [{"id": "t1", "title": "משימה", "description": "פרטים"}],
            "ar",
        )
    )
    assert result[0]["title"] == "مهمة"
    assert result[0]["description"] == "تفاصيل"
    assert result[0]["title_he"] == "משימה"
    assert result[0]["translation_pending"] is False


def test_translate_missing_uses_google_when_configured(monkeypatch):
    async def fake_google(self, tasks, language):
        return [
            {
                "id": "occ-2",
                "title": "Titre",
                "description": "Desc",
                "spoken_text": "Titre. Desc",
                "display_language": language,
                "translation_pending": False,
            }
        ]

    monkeypatch.setattr("app.services.task_translation_service.google_translate_configured", lambda: True)
    monkeypatch.setattr(TaskTranslationService, "_translate_batch_google", fake_google)

    service = TaskTranslationService(_FakeRepo())  # type: ignore[arg-type]
    result = asyncio.run(
        service._translate_missing(
            [{"id": "occ-2", "title": "משימה", "description": ""}],
            "fr",
        )
    )
    assert result[0]["title"] == "Titre"
    assert _source_hash("משימה", "")
