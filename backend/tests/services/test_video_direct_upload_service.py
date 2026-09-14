from app.services.video_direct_upload_service import create_video_upload_intent


def test_create_video_upload_intent_proxy_without_object_store(monkeypatch):
    monkeypatch.setattr(
        "app.services.video_direct_upload_service.config.object_storage_enabled",
        lambda: False,
    )
    assert create_video_upload_intent("task", "video/mp4") == {"mode": "proxy"}


def test_create_video_upload_intent_proxy_on_local_uvicorn(monkeypatch):
    monkeypatch.setattr(
        "app.services.video_direct_upload_service.config.object_storage_enabled",
        lambda: True,
    )
    monkeypatch.setattr("app.services.video_direct_upload_service.config.IS_PRODUCTION", False)
    assert create_video_upload_intent("task", "video/webm") == {"mode": "proxy"}


def test_create_video_upload_intent_direct_on_render_prod(monkeypatch):
    monkeypatch.setattr(
        "app.services.video_direct_upload_service.config.object_storage_enabled",
        lambda: True,
    )
    monkeypatch.setattr("app.services.video_direct_upload_service.config.IS_PRODUCTION", True)
    monkeypatch.setattr(
        "app.services.blob_storage.presign_put_url",
        lambda key, mime: f"https://signed.example/put/{key}?ct={mime}",
    )
    monkeypatch.setattr(
        "app.services.blob_storage.object_url_for_key",
        lambda key: f"https://abc.r2.cloudflarestorage.com/super-media/{key}",
    )
    intent = create_video_upload_intent("task", "video/webm")
    assert intent["mode"] == "direct"
    assert intent["pathname"].startswith("task_videos/")
    assert intent["pathname"].endswith(".webm")
    assert intent["putUrl"].startswith("https://signed.example/put/")
    assert intent["headers"] == {"Content-Type": "video/webm"}
    assert intent["url"].startswith("https://abc.r2.cloudflarestorage.com/super-media/")
    assert intent["kind"] == "video"
