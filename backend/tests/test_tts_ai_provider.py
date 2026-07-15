"""Tests configuration TTS / traduction Google."""
from app.domain.ai_provider import is_google_translate_configured, is_tts_ai_configured


def test_google_cloud_flags_require_api_key(monkeypatch):
    monkeypatch.setattr("app.core.config.GOOGLE_CLOUD_API_KEY", "")
    assert is_tts_ai_configured() is False
    assert is_google_translate_configured() is False

    monkeypatch.setattr("app.core.config.GOOGLE_CLOUD_API_KEY", "gcp-key")
    assert is_tts_ai_configured() is True
    assert is_google_translate_configured() is True
