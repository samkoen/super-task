"""Repli local du stockage média (sans R2)."""
from __future__ import annotations

from pathlib import Path


def test_put_bytes_writes_local_file(monkeypatch, tmp_path: Path):
    monkeypatch.setattr("app.services.blob_storage.config.object_storage_enabled", lambda: False)
    monkeypatch.setattr("app.services.blob_storage.config.IS_PRODUCTION", False)
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
    monkeypatch.setattr("app.services.blob_storage.config.object_storage_enabled", lambda: False)
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


def test_media_is_ready_local_uploads_are_sync(monkeypatch, tmp_path):
    monkeypatch.setattr("app.services.blob_storage.UPLOADS_DIR", tmp_path)
    video_dir = tmp_path / "task_videos"
    video_dir.mkdir()
    (video_dir / "a.mp4").write_bytes(b"vid")
    from app.services.blob_storage import media_is_ready

    assert media_is_ready("") is False
    assert media_is_ready("/uploads/task_videos/a.mp4") is True
    assert media_is_ready("/uploads/task_videos/missing.mp4") is False


def test_media_is_ready_uses_object_store(monkeypatch):
    monkeypatch.setattr("app.services.blob_storage.config.object_storage_enabled", lambda: True)
    monkeypatch.setattr(
        "app.services.blob_storage.config.r2_endpoint_host",
        lambda: "abc.r2.cloudflarestorage.com",
    )
    monkeypatch.setattr("app.services.object_store.object_is_readable", lambda _url: True)
    from app.services import blob_storage

    url = "https://abc.r2.cloudflarestorage.com/super-media/v.mp4"
    assert blob_storage.media_is_ready(url) is True
    monkeypatch.setattr("app.services.object_store.object_is_readable", lambda _url: False)
    assert blob_storage.media_is_ready(url) is False


def test_is_remote_media_url():
    from app.domain.object_media_url import is_vercel_blob_url
    from app.services.blob_storage import is_object_store_url, is_private_blob_url, is_remote_media_url, is_stored_media_url

    assert is_remote_media_url("https://abc.r2.cloudflarestorage.com/b/a.jpg") is True
    assert is_remote_media_url("/uploads/task_photos/a.jpg") is False
    assert is_remote_media_url(None) is False
    assert is_vercel_blob_url("https://x.private.blob.vercel-storage.com/a.jpg") is True
    assert is_private_blob_url("https://x.private.blob.vercel-storage.com/a.jpg") is True
    assert is_object_store_url("https://abc.r2.cloudflarestorage.com/b/a.jpg") is True
    assert is_stored_media_url("https://x.private.blob.vercel-storage.com/avatars/a.jpg") is False
    assert is_stored_media_url("/uploads/avatars/a.jpg") is True


def test_presign_get_ignores_legacy_vercel_blob(monkeypatch):
    monkeypatch.setattr("app.services.blob_storage.config.object_storage_enabled", lambda: True)
    from app.services import blob_storage

    assert blob_storage.presign_get_url("https://x.private.blob.vercel-storage.com/a.jpg") is None


def test_fetch_media_reads_local_uploads(monkeypatch, tmp_path):
    monkeypatch.setattr("app.services.blob_storage.UPLOADS_DIR", tmp_path)
    photo_dir = tmp_path / "task_photos"
    photo_dir.mkdir()
    (photo_dir / "a.jpg").write_bytes(b"local")
    from app.services import blob_storage

    payload = blob_storage.fetch_media("/uploads/task_photos/a.jpg")
    assert payload is not None
    assert payload.content == b"local"
