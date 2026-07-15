"""Tests langue source des tâches."""
from __future__ import annotations

from types import SimpleNamespace

from app.domain.task_translation_source import task_source_language


class _FakeUsers:
    def __init__(self, users: dict[str, object]):
        self._users = users

    def find_by_id(self, user_id: str):
        return self._users.get(user_id)


def test_task_source_language_uses_manager_preferred_language():
    manager = SimpleNamespace(preferred_language="he")
    users = _FakeUsers({"mgr-1": manager})
    occurrence = SimpleNamespace(created_by_id="mgr-1", manager_user_id=None)
    assert task_source_language(occurrence, users) == "he"


def test_task_source_language_falls_back_to_config(monkeypatch):
    monkeypatch.setattr("app.domain.task_translation_source.config.GOOGLE_TRANSLATE_SOURCE", "he")
    users = _FakeUsers({})
    occurrence = SimpleNamespace(created_by_id=None, manager_user_id=None)
    assert task_source_language(occurrence, users) == "he"
