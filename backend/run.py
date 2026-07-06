"""
Lance l'API Uvicorn. Utilise le venv backend/.venv s'il existe.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

_root = Path(__file__).resolve().parent
_venv_python = (
    _root / ".venv" / "Scripts" / "python.exe"
    if sys.platform == "win32"
    else _root / ".venv" / "bin" / "python"
)

if _venv_python.is_file() and Path(sys.executable).resolve() != _venv_python.resolve():
    os.execv(
        str(_venv_python),
        [str(_venv_python), str(Path(__file__).resolve())] + sys.argv[1:],
    )

import uvicorn

if __name__ == "__main__":
    host = os.environ.get("UVICORN_HOST", "0.0.0.0")
    port = int(os.environ.get("UVICORN_PORT", os.environ.get("PORT", "5001")))
    reload = os.environ.get("UVICORN_RELOAD", "0").lower() in ("1", "true", "yes")
    print(f"\n=== Super API (FastAPI / Uvicorn) ===\n  http://127.0.0.1:{port}/health\n")
    uvicorn.run("app.main:app", host=host, port=port, reload=reload)
