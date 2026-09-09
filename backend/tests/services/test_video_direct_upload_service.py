from app.services.video_direct_upload_service import create_video_upload_intent


def test_create_video_upload_intent_proxy_without_blob(monkeypatch):
    monkeypatch.setattr("app.services.video_direct_upload_service.config.BLOB_READ_WRITE_TOKEN", "")
    monkeypatch.setattr(
        "app.services.video_direct_upload_service.config.blob_storage_enabled",
        lambda: False,
    )
    assert create_video_upload_intent("task", "video/mp4") == {"mode": "proxy"}


def test_create_video_upload_intent_proxy_on_local_uvicorn(monkeypatch):
    monkeypatch.setattr(
        "app.services.video_direct_upload_service.config.blob_storage_enabled",
        lambda: True,
    )
    monkeypatch.setattr("app.services.video_direct_upload_service.config.IS_VERCEL", False)
    assert create_video_upload_intent("task", "video/webm") == {"mode": "proxy"}


def test_create_video_upload_intent_direct_when_blob_enabled(monkeypatch):
    monkeypatch.setattr(
        "app.services.video_direct_upload_service.config.BLOB_READ_WRITE_TOKEN",
        "vercel_blob_rw_STORE99_secret",
    )
    monkeypatch.setattr(
        "app.services.video_direct_upload_service.config.blob_storage_enabled",
        lambda: True,
    )
    monkeypatch.setattr("app.services.video_direct_upload_service.config.IS_VERCEL", True)
    monkeypatch.setattr("app.services.video_direct_upload_service.config.BLOB_ACCESS", "private")
    intent = create_video_upload_intent("task", "video/webm")
    assert intent["mode"] == "direct"
    assert intent["pathname"].startswith("task_videos/")
    assert intent["pathname"].endswith(".webm")
    assert intent["token"].startswith("vercel_blob_client_STORE99_")
    assert intent["access"] == "private"
    assert intent["kind"] == "video"
