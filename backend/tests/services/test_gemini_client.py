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


def test_image_models_chain_starts_with_configured_model(monkeypatch):
    monkeypatch.setattr("app.core.config.GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image")
    monkeypatch.setattr(
        "app.core.config.GEMINI_IMAGE_FALLBACK_MODELS",
        "gemini-2.0-flash-preview-image-generation",
    )
    chain = gc._image_models_chain()
    assert chain[0] == "gemini-2.5-flash-image"
    assert "gemini-2.0-flash-preview-image-generation" in chain


def test_generate_image_from_photo_extracts_bytes(monkeypatch):
    import base64

    raw = base64.b64encode(b"img").decode("ascii")
    response = MagicMock()
    response.status_code = 200
    response.json.return_value = {
        "candidates": [
            {
                "content": {
                    "parts": [{"inlineData": {"mimeType": "image/png", "data": raw}}]
                }
            }
        ]
    }
    monkeypatch.setattr(gc, "_post_generate", AsyncMock(return_value=response))
    monkeypatch.setattr("app.core.config.GEMINI_API_KEY", "k")
    monkeypatch.setattr("app.core.config.GEMINI_RETRY_COUNT", 0)
    data, mime = asyncio.run(gc.generate_image_from_photo(b"src", "image/jpeg", "prompt"))
    assert data == b"img"
    assert mime == "image/png"
