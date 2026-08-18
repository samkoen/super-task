"""Chaîne de modèles Gemini : 404 non retenté, fallback vers un modèle vivant."""
from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core import config
from app.services.ai import gemini_client as gc


def test_default_model_is_current_flash():
    assert config.DEFAULT_GEMINI_MODEL == "gemini-3.6-flash"
    assert "gemini-2.0-flash" not in config.DEFAULT_GEMINI_GENERATION_FALLBACK_MODELS


def test_models_chain_skips_duplicates_and_keeps_fallback(monkeypatch):
    monkeypatch.setattr(
        "app.core.config.GEMINI_GENERATION_FALLBACK_MODELS",
        "gemini-3.6-flash,gemini-2.5-flash",
    )
    chain = gc._models_chain("gemini-2.0-flash", use_generation_fallbacks=True)
    assert chain[0] == "gemini-2.0-flash"
    assert chain[1] == "gemini-3.6-flash"
    assert chain.count("gemini-3.6-flash") == 1


def test_404_is_not_retryable():
    assert gc._is_retryable_status(404) is False
    assert gc._is_retryable_status(401) is False
    assert gc._is_retryable_status(429) is True
    assert gc._is_retryable_status(503) is True


def test_request_with_retries_does_not_repeat_404(monkeypatch):
    response = MagicMock()
    response.status_code = 404
    response.json.return_value = {"error": {"message": "model gone"}}
    response.text = "model gone"
    post = AsyncMock(return_value=response)
    monkeypatch.setattr(gc, "_post_generate", post)
    monkeypatch.setattr("app.core.config.GEMINI_RETRY_COUNT", 2)

    with pytest.raises(gc.GeminiError) as exc:
        asyncio.run(gc._request_with_retries("gemini-2.0-flash", "k", {}, 5.0))

    assert exc.value.retryable is False
    assert post.await_count == 1
