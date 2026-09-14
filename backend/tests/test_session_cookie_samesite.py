"""APK Capacitor needs SameSite=None when cookies are Secure (prod Render)."""

from app.core.config import resolve_cookie_secure


def test_production_defaults_to_secure_cookies():
    assert resolve_cookie_secure(None, is_production=True) is True


def test_development_defaults_to_insecure_cookies():
    assert resolve_cookie_secure(None, is_production=False) is False


def test_explicit_false_overrides_production():
    assert resolve_cookie_secure("false", is_production=True) is False


def test_session_uses_none_when_cookie_secure():
    same_site = "none" if resolve_cookie_secure("true", is_production=False) else "lax"
    assert same_site == "none"


def test_session_uses_lax_when_not_secure():
    same_site = "none" if resolve_cookie_secure(None, is_production=False) else "lax"
    assert same_site == "lax"
