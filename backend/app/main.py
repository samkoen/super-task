"""Application FastAPI — Super (port 5001)."""
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from app.controllers import (
    auth_controller,
    branch_controller,
    dashboard_controller,
    department_controller,
    events_controller,
    invitation_controller,
    network_controller,
    product_controller,
    task_controller,
    user_controller,
)
from app.core.config import FRONTEND_URL, SECRET_KEY
from app.realtime.sse_hub import sse_hub


@asynccontextmanager
async def lifespan(app: FastAPI):
    sse_hub.bind_loop(asyncio.get_running_loop())
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="Super API", redirect_slashes=False, lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(
        SessionMiddleware,
        secret_key=SECRET_KEY,
        max_age=60 * 60 * 24 * 31,
        same_site="lax",
        https_only=False,
    )

    backend_dir = Path(__file__).resolve().parent.parent
    uploads_dir = backend_dir / "uploads"
    uploads_dir.mkdir(exist_ok=True)
    (uploads_dir / "task_photos").mkdir(exist_ok=True)
    (uploads_dir / "task_videos").mkdir(exist_ok=True)
    (uploads_dir / "task_audio").mkdir(exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

    @app.get("/health", tags=["health"])
    def health_check():
        return {"status": "ok", "app": "super"}

    app.include_router(auth_controller.router, prefix="/api/auth", tags=["auth"])
    app.include_router(user_controller.router, prefix="/api/users", tags=["users"])
    app.include_router(invitation_controller.router, prefix="/api/invitations", tags=["invitations"])
    app.include_router(network_controller.router, prefix="/api/networks", tags=["networks"])
    app.include_router(branch_controller.router, prefix="/api/branches", tags=["branches"])
    app.include_router(department_controller.router, prefix="/api/departments", tags=["departments"])
    app.include_router(product_controller.router, prefix="/api/products", tags=["products"])
    app.include_router(task_controller.router, prefix="/api/tasks", tags=["tasks"])
    app.include_router(dashboard_controller.router, prefix="/api/dashboard", tags=["dashboard"])
    app.include_router(events_controller.router, prefix="/api/events", tags=["events"])

    return app

app = create_app()
