"""Compression photo de référence / clôture."""
from __future__ import annotations

import io

from PIL import Image

from app.domain.media_compression import compress_photo_bytes


def _png_bytes(width: int = 2000, height: int = 1000) -> bytes:
    img = Image.new("RGB", (width, height), color=(30, 120, 200))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_compress_photo_downscales_and_returns_jpeg():
    raw = _png_bytes()
    out, ext, content_type = compress_photo_bytes(raw)
    assert ext == ".jpg"
    assert content_type == "image/jpeg"
    assert len(out) < len(raw)
    img = Image.open(io.BytesIO(out))
    assert max(img.size) <= 1280


def test_compress_photo_keeps_small_images():
    raw = _png_bytes(width=400, height=300)
    out, ext, _ = compress_photo_bytes(raw)
    img = Image.open(io.BytesIO(out))
    assert img.size == (400, 300)
    assert ext == ".jpg"


def _transparent_png(width: int = 1600, height: int = 1200) -> bytes:
    img = Image.new("RGBA", (width, height), color=(0, 0, 0, 0))
    img.paste((247, 112, 30, 255), (100, 100, 500, 500))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_compress_photo_keeps_transparency_as_png():
    out, ext, content_type = compress_photo_bytes(_transparent_png())
    assert ext == ".png"
    assert content_type == "image/png"
    img = Image.open(io.BytesIO(out))
    assert img.mode == "RGBA"
    assert max(img.size) <= 1280
    assert img.getpixel((2, 2))[3] == 0


def test_compress_photo_opaque_rgba_still_becomes_jpeg():
    img = Image.new("RGBA", (300, 300), color=(10, 20, 30, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    _out, ext, content_type = compress_photo_bytes(buf.getvalue())
    assert (ext, content_type) == (".jpg", "image/jpeg")


def test_save_photo_bytes_stores_transparent_example_as_png(monkeypatch):
    """Les illustrations d'exemple du FLOW 1 (PNG détourés) ne doivent pas être aplaties en noir."""
    from app.services import media_upload_service

    stored: dict = {}

    def fake_put(*, folder, data, ext, content_type):
        stored.update(data=data, ext=ext, content_type=content_type)
        return "/media/x" + ext

    monkeypatch.setattr(media_upload_service.blob_storage, "put_bytes", fake_put)
    url = media_upload_service.save_photo_bytes(folder="task_photos", data=_transparent_png())
    assert url.endswith(".png")
    assert stored["content_type"] == "image/png"
    assert Image.open(io.BytesIO(stored["data"])).getpixel((2, 2))[3] == 0
