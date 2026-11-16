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

from app.domain.dev_server import should_reload
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
    # Rechargement auto en développement local ; UVICORN_RELOAD=0 pour le couper.
    reload = should_reload(os.environ)

    if sys.platform == "win32" and reload:
        print("Rechargement auto actif (code modifié = API relancée). UVICORN_RELOAD=0 pour le couper.")
        print("Si un processus reste après Ctrl+C : Get-Process python | Stop-Process")

    signal.signal(signal.SIGINT, _handle_interrupt)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, _handle_interrupt)

    print(f"\n=== super-man API (FastAPI / Uvicorn) ===\n  http://127.0.0.1:{port}/health\n")

    log_level = os.environ.get("LOG_LEVEL", "debug" if os.environ.get("ENVIRONMENT", "development") == "development" else "info").lower()

    if reload:
        # Le rechargement auto exige un import string (sous-processus).
        uvicorn.run(
            "app.main:app",
            host=host,
            port=port,
            reload=True,
            # Seulement le code : ni .venv, ni uploads, ni tests ne doivent relancer l'API.
            reload_dirs=[str(_root / "app")],
            log_level=log_level,
            timeout_graceful_shutdown=3,
        )
        return

    # Objet ASGI direct = un seul processus, Ctrl+C fiable sous Windows.
    uvicorn.run(
        create_app(),
        host=host,
        port=port,
        reload=False,
        log_level=log_level,
        timeout_graceful_shutdown=3,
    )


if __name__ == "__main__":
    main()
