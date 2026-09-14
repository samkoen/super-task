from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException
from fastapi.responses import FileResponse, RedirectResponse

from app.controllers import media_controller as ctrl


def test_serve_media_redirects_r2_to_presigned_get(monkeypatch):
    monkeypatch.setattr(ctrl, "load_actor", lambda *_a, **_k: MagicMock(user_id="u1"))
    monkeypatch.setattr(ctrl, "UserRepository", lambda _db: MagicMock())
    monkeypatch.setattr(ctrl.blob_storage, "is_stored_media_url", lambda _url: True)
    monkeypatch.setattr(ctrl, "actor_can_access_media_url", lambda *_a, **_k: True)
    monkeypatch.setattr(
        ctrl.blob_storage,
        "presign_get_url",
        lambda url: "https://signed.example/get/v.webm",
    )
    request = MagicMock()
    url = "https://abc.r2.cloudflarestorage.com/super-media/task_videos/v.webm"
    response = ctrl._serve_media(request, url, MagicMock())
    assert isinstance(response, RedirectResponse)
    assert response.status_code == 302
    assert response.headers["location"] == "https://signed.example/get/v.webm"


def test_serve_media_streams_local_file(monkeypatch, tmp_path):
    monkeypatch.setattr(ctrl, "load_actor", lambda *_a, **_k: MagicMock(user_id="u1"))
    monkeypatch.setattr(ctrl, "UserRepository", lambda _db: MagicMock())
    monkeypatch.setattr(ctrl.blob_storage, "is_stored_media_url", lambda _url: True)
    monkeypatch.setattr(ctrl, "actor_can_access_media_url", lambda *_a, **_k: True)
    video = tmp_path / "a.webm"
    video.write_bytes(b"webm")
    monkeypatch.setattr(ctrl.blob_storage, "local_file_path", lambda _url: video)
    response = ctrl._serve_media(MagicMock(), "/uploads/task_videos/a.webm", MagicMock())
    assert isinstance(response, FileResponse)
    assert response.path == video


def test_serve_media_forbidden_skips_presign(monkeypatch):
    monkeypatch.setattr(ctrl, "load_actor", lambda *_a, **_k: MagicMock(user_id="u1"))
    monkeypatch.setattr(ctrl, "UserRepository", lambda _db: MagicMock())
    monkeypatch.setattr(ctrl.blob_storage, "is_stored_media_url", lambda _url: True)
    monkeypatch.setattr(ctrl, "actor_can_access_media_url", lambda *_a, **_k: False)
    called = {"n": 0}
    monkeypatch.setattr(
        ctrl.blob_storage,
        "presign_get_url",
        lambda _url: called.__setitem__("n", called["n"] + 1) or "https://signed.example",
    )
    url = "https://abc.r2.cloudflarestorage.com/super-media/task_videos/v.webm"
    with pytest.raises(HTTPException) as exc:
        ctrl._serve_media(MagicMock(), url, MagicMock())
    assert exc.value.status_code == 403
    assert called["n"] == 0


def test_serve_media_rejects_evil_url(monkeypatch):
    monkeypatch.setattr(ctrl, "load_actor", lambda *_a, **_k: MagicMock(user_id="u1"))
    monkeypatch.setattr(ctrl, "UserRepository", lambda _db: MagicMock())
    with pytest.raises(HTTPException) as exc:
        ctrl._serve_media(MagicMock(), "https://evil.example/secret", MagicMock())
    assert exc.value.status_code == 400
