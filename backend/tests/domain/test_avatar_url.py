import pytest

from app.domain.avatar_url import normalize_avatar_url


def test_empty_becomes_none():
    assert normalize_avatar_url(None) is None
    assert normalize_avatar_url("  ") is None


def test_local_avatars_path():
    assert normalize_avatar_url("/uploads/avatars/a.jpg") == "/uploads/avatars/a.jpg"


def test_https_blob_url():
    url = "https://x.blob.vercel-storage.com/avatars/a.jpg"
    assert normalize_avatar_url(url) == url


def test_rejects_javascript():
    with pytest.raises(ValueError, match="לא חוקי"):
        normalize_avatar_url("javascript:alert(1)")
