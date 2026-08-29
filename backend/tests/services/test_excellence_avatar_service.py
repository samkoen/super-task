"""ExcellenceAvatarService — stylize Gemini avec repli photo originale."""
from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock

from app.services.ai.gemini_client import GeminiError
from app.services.excellence_avatar_service import ExcellenceAvatarService


def test_stylize_uses_ai_image_and_slogan(monkeypatch):
    monkeypatch.setattr(
        "app.services.excellence_avatar_service.generate_image_from_photo",
        AsyncMock(return_value=(b"ai-jpeg", "image/jpeg")),
    )
    save = MagicMock(return_value="/uploads/avatars/ai.jpg")
    monkeypatch.setattr("app.services.excellence_avatar_service.save_photo_bytes", save)
    out = asyncio.run(
        ExcellenceAvatarService().stylize(
            photo_bytes=b"raw",
            mime_type="image/jpeg",
            user_id="u1",
            first_name="דנה",
        )
    )
    assert out.url == "/uploads/avatars/ai.jpg"
    assert out.used_ai is True
    assert out.slogan
    save.assert_called_once()
    assert save.call_args.kwargs["data"] == b"ai-jpeg"


def test_stylize_falls_back_when_gemini_fails(monkeypatch):
    monkeypatch.setattr(
        "app.services.excellence_avatar_service.generate_image_from_photo",
        AsyncMock(side_effect=GeminiError("down")),
    )
    save = MagicMock(return_value="/uploads/avatars/raw.jpg")
    monkeypatch.setattr("app.services.excellence_avatar_service.save_photo_bytes", save)
    out = asyncio.run(
        ExcellenceAvatarService().stylize(
            photo_bytes=b"original",
            mime_type="image/jpeg",
            user_id="u1",
            first_name="דנה",
        )
    )
    assert out.used_ai is False
    assert save.call_args.kwargs["data"] == b"original"
    assert out.slogan
