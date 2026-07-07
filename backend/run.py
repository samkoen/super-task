"""
Lance l'API Uvicorn. Utilise le venv backend/.venv s'il existe.
"""
from __future__ import annotations

import os
import signal
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

from app.main import create_app

_interrupts = 0


def _handle_interrupt(signum, frame) -> None:
    global _interrupts
    _interrupts += 1
    if _interrupts >= 2:
        os._exit(0)
    raise KeyboardInterrupt


def main() -> None:
    host = os.environ.get("UVICORN_HOST", "0.0.0.0")
    port = int(os.environ.get("UVICORN_PORT", os.environ.get("PORT", "5001")))
    reload = os.environ.get("UVICORN_RELOAD", "0").lower() in ("1", "true", "yes")

    if sys.platform == "win32" and reload:
        print("AVERTISSEMENT: UVICORN_RELOAD=1 sous Windows peut laisser un processus")
        print("orphelin après Ctrl+C. Préférez UVICORN_RELOAD=0 ou arrêtez avec:")
        print("  Get-Process python | Stop-Process")

    signal.signal(signal.SIGINT, _handle_interrupt)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, _handle_interrupt)

    print(f"\n=== Super API (FastAPI / Uvicorn) ===\n  http://127.0.0.1:{port}/health\n")

    if reload:
        # Le rechargement auto exige un import string (sous-processus).
        uvicorn.run(
            "app.main:app",
            host=host,
            port=port,
            reload=True,
            timeout_graceful_shutdown=3,
        )
        return

    # Objet ASGI direct = un seul processus, Ctrl+C fiable sous Windows.
    uvicorn.run(
        create_app(),
        host=host,
        port=port,
        reload=False,
        timeout_graceful_shutdown=3,
    )


if __name__ == "__main__":
    main()
