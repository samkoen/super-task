from __future__ import annotations

import asyncio

from app.domain.text_localization import localize_text


def test_same_language_returns_original():
    result = asyncio.run(localize_text("לצלם את המדף", source_language="he", target_language="he"))
    assert result == "לצלם את המדף"


def test_empty_text_returns_empty():
    result = asyncio.run(localize_text("  ", source_language="he", target_language="th"))
    assert result == ""


def test_without_google_returns_original(monkeypatch):
    monkeypatch.setattr("app.domain.text_localization.google_translate_configured", lambda: False)
    result = asyncio.run(localize_text("לצלם את המדף", source_language="he", target_language="th"))
    assert result == "לצלם את המדף"
