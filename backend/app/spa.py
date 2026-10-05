"""Sert le build Vite (frontend/dist) sur le même hôte que /api."""
from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse

_BACKEND_DIR = Path(__file__).resolve().parent.parent
_DEFAULT_DIST = _BACKEND_DIR.parent / "frontend" / "dist"
_RESERVED_PREFIXES = frozenset({"api", "uploads"})
_ASSET_CACHE = "public, max-age=31536000, immutable"
_HTML_CACHE = "no-cache"


def frontend_dist_dir() -> Path:
    return _DEFAULT_DIST


def _is_inside(path: Path, root: Path) -> bool:
    try:
        path.relative_to(root)
    except ValueError:
        return False
    return path != root


def resolve_spa_file(dist: Path, url_path: str) -> Path | None:
    """Fichier réel sous dist, ou None si absent ou hors dossier."""
    relative = url_path.lstrip("/")
    root = dist.resolve()
    if not relative:
        index = root / "index.html"
        return index if index.is_file() else None
    candidate = (root / relative).resolve()
    if not _is_inside(candidate, root) or not candidate.is_file():
        return None
    return candidate


def _looks_like_file(url_path: str) -> bool:
    return "." in Path(url_path).name


def _long_cache(url_path: str) -> bool:
    return "assets" in url_path.strip("/").split("/")


def spa_file_response(path: Path, *, long_cache: bool) -> FileResponse:
    cache = _ASSET_CACHE if long_cache else _HTML_CACHE
    if path.suffix == ".html":
        return FileResponse(path, media_type="text/html; charset=utf-8", headers={"Cache-Control": cache})
    return FileResponse(path, headers={"Cache-Control": cache})


def spa_response(dist: Path, url_path: str) -> FileResponse:
    """Fichier statique, ou index.html pour une route client sans extension."""
    existing = resolve_spa_file(dist, url_path)
    if existing is not None:
        return spa_file_response(existing, long_cache=_long_cache(url_path))
    index = dist / "index.html"
    if _looks_like_file(url_path) or not index.is_file():
        raise HTTPException(status_code=404)
    return spa_file_response(index, long_cache=False)


def _reserved_prefix(full_path: str) -> bool:
    head = full_path.split("/", 1)[0]
    return head in _RESERVED_PREFIXES


def mount_frontend(app: FastAPI, dist: Path | None = None) -> None:
    """Branche le site si frontend/dist/index.html existe. /api et /uploads restent prioritaires."""
    folder = frontend_dist_dir() if dist is None else dist
    if not (folder / "index.html").is_file():
        return

    def page(full_path: str) -> FileResponse:
        if _reserved_prefix(full_path):
            raise HTTPException(status_code=404)
        target = f"/{full_path}" if full_path else "/"
        return spa_response(folder, target)

    @app.get("/", include_in_schema=False)
    def frontend_index() -> FileResponse:
        return page("")

    @app.get("/{full_path:path}", include_in_schema=False)
    def frontend_page(full_path: str) -> FileResponse:
        return page(full_path)
