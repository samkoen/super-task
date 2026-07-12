"""Tests traduction tâches employé."""
from __future__ import annotations

from app.services.task_translation_service import (
    TaskTranslationService,
    _default_spoken_text,
    _source_hash,
)


class _Cached:
    def __init__(self, row: dict):
        self.occurrence_id = row["occurrence_id"]
        self.title = row["title"]
        self.description = row["description"]
        self.spoken_text = row["spoken_text"]
        self.source_hash = row["source_hash"]


class _FakeRepo:
    def __init__(self):
        self.rows: dict[tuple[str, str], dict] = {}

    def get_many(self, occurrence_ids, language):
        return {
            occ_id: _Cached(self.rows[(occ_id, language)])
            for occ_id in occurrence_ids
            if (occ_id, language) in self.rows
        }

    def upsert(self, **kwargs):
        key = (kwargs["occurrence_id"], kwargs["language"])
        self.rows[key] = dict(kwargs)


def test_source_hash_changes_with_description():
    assert _source_hash("a", "b") != _source_hash("a", "c")


def test_apply_to_cards_hebrew_skips_translation():
    service = TaskTranslationService(_FakeRepo())  # type: ignore[arg-type]
    cards = [{"id": "1", "title": "משימה", "description": "פרטים"}]
    result = service.apply_to_cards(cards, language="he")
    assert result[0]["title"] == "משימה"
    assert result[0]["spoken_text"] == _default_spoken_text("משימה", "פרטים")


def test_apply_to_cards_uses_cache():
    repo = _FakeRepo()
    digest = _source_hash("title", "desc")
    repo.rows[("occ-1", "fr")] = {
        "occurrence_id": "occ-1",
        "language": "fr",
        "title": "Titre",
        "description": "Desc",
        "spoken_text": "Titre. Desc",
        "source_hash": digest,
    }
    service = TaskTranslationService(repo)  # type: ignore[arg-type]
    result = service.apply_to_cards(
        [{"id": "occ-1", "title": "title", "description": "desc"}],
        language="fr",
    )
    assert result[0]["title"] == "Titre"
    assert result[0]["translation_pending"] is False


def test_apply_to_cards_marks_pending_without_cache():
    service = TaskTranslationService(_FakeRepo())  # type: ignore[arg-type]
    result = service.apply_to_cards(
        [{"id": "occ-2", "title": "משימה", "description": ""}],
        language="fr",
    )
    assert result[0]["title"] == "משימה"
    assert result[0]["translation_pending"] is True


def test_apply_to_cards_preserves_due_at():
    repo = _FakeRepo()
    digest = _source_hash("title", "desc")
    repo.rows[("occ-1", "fr")] = {
        "occurrence_id": "occ-1",
        "language": "fr",
        "title": "Titre",
        "description": "Desc",
        "spoken_text": "Titre. Desc",
        "source_hash": digest,
    }
    service = TaskTranslationService(repo)  # type: ignore[arg-type]
    result = service.apply_to_cards(
        [
            {
                "id": "occ-1",
                "title": "title",
                "description": "desc",
                "due_at": "2026-07-12T14:30:00+03:00",
                "status": "pending",
            }
        ],
        language="fr",
    )
    assert result[0]["title"] == "Titre"
    assert result[0]["due_at"] == "2026-07-12T14:30:00+03:00"
    assert result[0]["status"] == "pending"
