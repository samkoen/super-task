"""Anti-SSRF : pas de fetch HTTP générique hors R2."""
from __future__ import annotations

from app.domain.object_media_url import MediaPayload


def test_fetch_media_rejects_arbitrary_http_urls(monkeypatch):
    monkeypatch.setattr("app.services.blob_storage.config.object_storage_enabled", lambda: True)
    from app.services import blob_storage

    assert blob_storage.fetch_media("http://169.254.169.254/latest/meta-data/") is None
    assert blob_storage.fetch_media("https://evil.example.com/secret") is None


def test_fetch_media_allows_r2_via_object_store(monkeypatch):
    monkeypatch.setattr("app.services.blob_storage.config.object_storage_enabled", lambda: True)
    monkeypatch.setattr(
        "app.services.blob_storage.config.r2_endpoint_host",
        lambda: "abc.r2.cloudflarestorage.com",
    )
    payload = MediaPayload(b"img", "image/jpeg", ".jpg")
    monkeypatch.setattr("app.services.object_store.get_payload", lambda url: payload)
    from app.services import blob_storage

    got = blob_storage.fetch_media(
        "https://abc.r2.cloudflarestorage.com/super-media/task_photos/a.jpg"
    )
    assert got is payload
