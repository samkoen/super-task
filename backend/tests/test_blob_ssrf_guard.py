"""Anti-SSRF : pas de fetch HTTP générique hors Vercel Blob."""
from __future__ import annotations


def test_fetch_media_rejects_arbitrary_http_urls(monkeypatch):
    monkeypatch.setattr("app.services.blob_storage.config.BLOB_READ_WRITE_TOKEN", "tok")
    from app.services import blob_storage

    assert blob_storage.fetch_media("http://169.254.169.254/latest/meta-data/") is None
    assert blob_storage.fetch_media("https://evil.example.com/secret") is None


def test_fetch_media_allows_vercel_blob_via_sdk(monkeypatch):
    monkeypatch.setattr("app.services.blob_storage.config.BLOB_READ_WRITE_TOKEN", "tok")
    monkeypatch.setattr("app.services.blob_storage.config.BLOB_ACCESS", "private")

    class FakeResult:
        content = b"img"
        content_type = "image/jpeg"
        pathname = "task_photos/a.jpg"

    class FakeClient:
        def get(self, url, *, access="private"):
            assert "private.blob.vercel-storage.com" in url
            return FakeResult()

    monkeypatch.setattr("app.services.blob_storage._client", lambda: FakeClient())
    from app.services import blob_storage

    payload = blob_storage.fetch_media(
        "https://x.private.blob.vercel-storage.com/task_photos/a.jpg"
    )
    assert payload is not None
    assert payload.content == b"img"
