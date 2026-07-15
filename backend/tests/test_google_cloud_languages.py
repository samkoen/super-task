"""Tests mapping Google Cloud langues."""
from app.domain.google_cloud_languages import (
    DEFAULT_TTS_VOICES,
    translate_target_code,
    tts_language_code,
    tts_voice_for,
)


def test_translate_target_code_arabic():
    assert translate_target_code("ar") == "ar"


def test_tts_voice_for_thai_default():
    assert tts_voice_for("th") == DEFAULT_TTS_VOICES["th"]


def test_tts_language_code_from_voice_name():
    assert tts_language_code("ar-XA-Wavenet-B") == "ar-XA"
    assert tts_language_code("th-TH-Neural2-C") == "th-TH"
