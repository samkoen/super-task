"""Tests langues employés."""
from app.domain.employee_language import (
    LANGUAGE_LABELS_HE,
    normalize_employee_language,
    needs_translation,
    speech_locale,
)


def test_normalize_employee_language():
    assert normalize_employee_language("ar") == "ar"
    assert normalize_employee_language("english") == "he"
    assert normalize_employee_language("") == "he"


def test_needs_translation():
    assert needs_translation("he") is False
    assert needs_translation("fr") is True


def test_speech_locale():
    assert speech_locale("th") == "th-TH"
    assert "עברית" in LANGUAGE_LABELS_HE["he"]
