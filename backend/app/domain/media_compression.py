"""Compression photo — qualité volontairement basse (fond de carte / preuve)."""
from __future__ import annotations

import io

from PIL import Image

from app.core import config


def compress_photo_bytes(data: bytes) -> tuple[bytes, str, str]:
    """Redimensionne et recompresse en JPEG. Retourne (bytes, ext, content_type)."""
    img = Image.open(io.BytesIO(data))
    if _has_transparency(img):
        return _compress_png(img)
    img = _to_rgb(img)
    img = _fit_max_edge(img, config.MEDIA_PHOTO_MAX_EDGE_PX)
    buf = io.BytesIO()
    img.save(
        buf,
        format="JPEG",
        quality=config.MEDIA_PHOTO_QUALITY,
        optimize=True,
    )
    return buf.getvalue(), ".jpg", "image/jpeg"


def _has_transparency(img: Image.Image) -> bool:
    """Vrai si au moins un pixel n'est pas opaque (illustration détourée)."""
    if img.mode in {"RGBA", "LA"}:
        low, _high = img.split()[-1].getextrema()
        return low < 255
    return img.mode == "P" and "transparency" in img.info


def _compress_png(img: Image.Image) -> tuple[bytes, str, str]:
    """Garde l'alpha : un JPEG remplirait le détourage d'un aplat."""
    img = _fit_max_edge(img.convert("RGBA"), config.MEDIA_PHOTO_MAX_EDGE_PX)
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue(), ".png", "image/png"


def _to_rgb(img: Image.Image) -> Image.Image:
    if img.mode == "RGB":
        return img
    if img.mode in {"RGBA", "LA"}:
        background = Image.new("RGB", img.size, (255, 255, 255))
        alpha = img.split()[-1]
        background.paste(img.convert("RGBA"), mask=alpha)
        return background
    return img.convert("RGB")


def _fit_max_edge(img: Image.Image, max_edge: int) -> Image.Image:
    if max_edge <= 0:
        return img
    width, height = img.size
    longest = max(width, height)
    if longest <= max_edge:
        return img
    ratio = max_edge / longest
    return img.resize(
        (max(1, int(width * ratio)), max(1, int(height * ratio))),
        Image.Resampling.LANCZOS,
    )
