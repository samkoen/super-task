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
