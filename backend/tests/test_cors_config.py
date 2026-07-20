import re

from app.core.config import CORS_ALLOW_ORIGIN_REGEX, CORS_ALLOW_ORIGINS


def test_cors_includes_capacitor_origins():
    assert "capacitor://localhost" in CORS_ALLOW_ORIGINS
    assert "https://localhost" in CORS_ALLOW_ORIGINS


def test_cors_lan_regex_in_development():
    assert CORS_ALLOW_ORIGIN_REGEX is not None
    pattern = re.compile(CORS_ALLOW_ORIGIN_REGEX)
    assert pattern.fullmatch("http://192.168.150.166:5173")
    assert pattern.fullmatch("http://10.0.0.5:5173")
    assert pattern.fullmatch("https://evil.com") is None
