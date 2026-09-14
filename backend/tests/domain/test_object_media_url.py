from app.domain.object_media_url import (
    is_private_object_url,
    is_r2_media_url,
    is_vercel_blob_url,
    key_from_stored_url,
    stored_object_url,
)


def test_stored_object_url_and_key_roundtrip():
    url = stored_object_url(
        "https://abc.r2.cloudflarestorage.com",
        "super-media",
        "task_videos/a.webm",
    )
    assert url == "https://abc.r2.cloudflarestorage.com/super-media/task_videos/a.webm"
    assert key_from_stored_url(url, "super-media") == "task_videos/a.webm"
    assert key_from_stored_url(url, "other") is None


def test_is_r2_and_vercel_detection():
    r2 = "https://abc.r2.cloudflarestorage.com/super-media/task_photos/a.jpg"
    blob = "https://x.private.blob.vercel-storage.com/a.jpg"
    assert is_r2_media_url(r2) is True
    assert is_vercel_blob_url(r2) is False
    assert is_private_object_url(r2) is True
    assert is_vercel_blob_url(blob) is True
    assert is_private_object_url(blob) is False
    assert is_private_object_url("https://x.public.blob.vercel-storage.com/a.jpg") is False
    assert is_r2_media_url("https://pub-abc.r2.dev/super-media/a.mp4") is True
    assert is_r2_media_url("/uploads/a.jpg") is False
