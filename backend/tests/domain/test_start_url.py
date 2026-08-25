from app.domain.start_url import normalize_start_url
import pytest


def test_empty_is_none():
    assert normalize_start_url(None) is None
    assert normalize_start_url("  ") is None


def test_https_ok():
    url = "https://my.agroline.co.il/main/azmanot/client-orders/create"
    assert normalize_start_url(url) == url


def test_http_ok():
    assert normalize_start_url("http://example.com/x") == "http://example.com/x"


def test_rejects_javascript():
    with pytest.raises(ValueError):
        normalize_start_url("javascript:alert(1)")


def test_rejects_missing_scheme():
    with pytest.raises(ValueError):
        normalize_start_url("my.agroline.co.il/x")


def test_rejects_too_long():
    with pytest.raises(ValueError):
        normalize_start_url("https://x/" + ("a" * 1024))
