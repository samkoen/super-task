"""Retry court si l'objet n'est pas encore lisible juste après l'upload."""
from __future__ import annotations

from app.domain.object_media_url import MediaPayload


def test_fetch_remote_retries_then_succeeds(monkeypatch):
    monkeypatch.setattr("app.services.blob_storage.config.object_storage_enabled", lambda: True)
    monkeypatch.setattr(
        "app.services.blob_storage.config.r2_endpoint_host",
        lambda: "abc.r2.cloudflarestorage.com",
    )
    monkeypatch.setattr("app.services.blob_storage.time.sleep", lambda _ms: None)
    calls = {"n": 0}
    payload = MediaPayload(b"img", "image/jpeg", ".jpg")

    def fake_once(_url: str):
        calls["n"] += 1
        return payload if calls["n"] >= 2 else None

    monkeypatch.setattr("app.services.blob_storage._fetch_remote_once", fake_once)
    from app.services import blob_storage

    got = blob_storage.fetch_media(
        "https://abc.r2.cloudflarestorage.com/super-media/a.jpg"
    )
    assert got is payload
    assert calls["n"] == 2


def test_fetch_remote_does_not_retry_non_store_urls(monkeypatch):
    monkeypatch.setattr("app.services.blob_storage.config.object_storage_enabled", lambda: True)
    slept = {"n": 0}
    monkeypatch.setattr(
        "app.services.blob_storage.time.sleep",
        lambda _ms: slept.__setitem__("n", slept["n"] + 1),
    )
    from app.services import blob_storage

    assert blob_storage.fetch_media("https://evil.example.com/secret") is None
    assert slept["n"] == 0
