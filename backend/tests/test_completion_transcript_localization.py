"""Tests localisation transcript clôture."""
from __future__ import annotations

import asyncio

from app.domain.completion_transcript_localization import localize_completion_transcript


def test_localize_same_language_returns_original():
    result = asyncio.run(
        localize_completion_transcript("hello", source_language="fr", target_language="fr")
    )
    assert result == "hello"


def test_localize_without_google_returns_original(monkeypatch):
    monkeypatch.setattr(
        "app.domain.completion_transcript_localization.google_translate_configured",
        lambda: False,
    )
    result = asyncio.run(
        localize_completion_transcript("bonjour", source_language="fr", target_language="he")
    )
    assert result == "bonjour"
