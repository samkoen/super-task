"""Repli local du stockage média (sans BLOB_READ_WRITE_TOKEN)."""
from __future__ import annotations

from pathlib import Path


def test_put_bytes_writes_local_file(monkeypatch, tmp_path: Path):
    monkeypatch.setattr("app.services.blob_storage.config.BLOB_READ_WRITE_TOKEN", "")
    monkeypatch.setattr("app.services.blob_storage.UPLOADS_DIR", tmp_path)

    from app.services import blob_storage

    url = blob_storage.put_bytes(
        folder="task_photos",
        data=b"hello",
        ext=".jpg",
        content_type="image/jpeg",
    )
    assert url.startswith("/uploads/task_photos/")
    relative = url.removeprefix("/uploads/")
    assert (tmp_path / relative).read_bytes() == b"hello"


def test_copy_local_duplicates_file(monkeypatch, tmp_path: Path):
    monkeypatch.setattr("app.services.blob_storage.config.BLOB_READ_WRITE_TOKEN", "")
    monkeypatch.setattr("app.services.blob_storage.UPLOADS_DIR", tmp_path)
    src_dir = tmp_path / "task_photos"
    src_dir.mkdir()
    src = src_dir / "a.jpg"
    src.write_bytes(b"photo")

    from app.services import blob_storage

    copied = blob_storage.copy_media_url("/uploads/task_photos/a.jpg", folder="task_photos")
    assert copied is not None
    assert copied != "/uploads/task_photos/a.jpg"
    assert (tmp_path / copied.removeprefix("/uploads/")).read_bytes() == b"photo"


def test_media_is_ready_local_uploads_are_sync():
    from app.services.blob_storage import media_is_ready

    assert media_is_ready("") is False
    assert media_is_ready("/uploads/task_videos/a.mp4") is True


def test_media_is_ready_uses_blob_head(monkeypatch):
    monkeypatch.setattr("app.services.blob_storage.config.BLOB_READ_WRITE_TOKEN", "tok")
    monkeypatch.setattr("app.services.blob_storage.config.blob_storage_enabled", lambda: True)
    monkeypatch.setattr("app.services.blob_storage.time.sleep", lambda _ms: None)
    monkeypatch.setattr("app.services.blob_storage._blob_head_ok", lambda _url: True)
    from app.services import blob_storage

    url = "https://x.private.blob.vercel-storage.com/v.mp4"
    assert blob_storage.media_is_ready(url) is True
    monkeypatch.setattr("app.services.blob_storage._blob_head_ok", lambda _url: False)
    assert blob_storage.media_is_ready(url) is False


def test_is_remote_media_url():
    from app.services.blob_storage import is_private_blob_url, is_remote_media_url, is_vercel_blob_url

    assert is_remote_media_url("https://x.public.blob.vercel-storage.com/a.jpg") is True
    assert is_remote_media_url("/uploads/task_photos/a.jpg") is False
    assert is_remote_media_url(None) is False
    assert is_vercel_blob_url("https://x.private.blob.vercel-storage.com/a.jpg") is True
    assert is_private_blob_url("https://x.private.blob.vercel-storage.com/a.jpg") is True
    assert is_private_blob_url("https://x.public.blob.vercel-storage.com/a.jpg") is False


def test_fetch_media_reads_local_uploads(monkeypatch, tmp_path):
    monkeypatch.setattr("app.services.blob_storage.UPLOADS_DIR", tmp_path)
    photo_dir = tmp_path / "task_photos"
    photo_dir.mkdir()
    (photo_dir / "a.jpg").write_bytes(b"local")
    from app.services import blob_storage

    payload = blob_storage.fetch_media("/uploads/task_photos/a.jpg")
    assert payload is not None
    assert payload.content == b"local"
