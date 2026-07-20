"""Application FastAPI — Super (port 5001)."""
from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from app.controllers import (
    ai_controller,
    auth_controller,
    branch_controller,
    cron_controller,
    dashboard_controller,
    department_controller,
    employee_activity_controller,
    events_controller,
    invitation_controller,
    issue_report_controller,
    media_controller,
    network_controller,
    notification_controller,
    product_controller,
    task_controller,
    task_gallery_controller,
    user_controller,
)
from app.core.config import (
    COOKIE_SECURE,
    CORS_ALLOW_ORIGIN_REGEX,
    CORS_ALLOW_ORIGINS,
    IS_PRODUCTION,
    LOG_LEVEL,
    SECRET_KEY,
    UPLOADS_DIR,
    assert_secure_runtime_config,
)
from app.realtime.sse_hub import sse_hub

logger = logging.getLogger(__name__)


def _configure_logging() -> None:
    level = getattr(logging, LOG_LEVEL, logging.INFO)
    logging.basicConfig(
        level=level,
        format="%(levelname)s [%(name)s] %(message)s",
        force=True,
    )
    logging.getLogger("uvicorn.error").setLevel(level)
    logging.getLogger("uvicorn.access").setLevel(level)
    logging.getLogger("app").setLevel(level)


@asynccontextmanager
async def lifespan(app: FastAPI):
    sse_hub.bind_loop(asyncio.get_running_loop())
    yield


def create_app() -> FastAPI:
    _configure_logging()
    assert_secure_runtime_config()
    app = FastAPI(title="Super API", redirect_slashes=False, lifespan=lifespan)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        logger.warning(
            "422 validation path=%s query=%s errors=%s",
            request.url.path,
            dict(request.query_params),
            exc.errors(),
        )
        return JSONResponse(status_code=422, content={"detail": exc.errors()})

    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ALLOW_ORIGINS,
        allow_origin_regex=CORS_ALLOW_ORIGIN_REGEX,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    # SameSite=None + Secure : cookies session pour l'APK Capacitor
    # (origine https://localhost → API https://*.vercel.app).
    # Sur le site web same-origin, None fonctionne aussi avec HTTPS.
    app.add_middleware(
        SessionMiddleware,
        secret_key=SECRET_KEY,
        max_age=60 * 60 * 24 * 31,
        same_site="none" if COOKIE_SECURE else "lax",
        https_only=COOKIE_SECURE,
    )

    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    (UPLOADS_DIR / "task_photos").mkdir(exist_ok=True)
    (UPLOADS_DIR / "task_videos").mkdir(exist_ok=True)
    (UPLOADS_DIR / "task_audio").mkdir(exist_ok=True)
    (UPLOADS_DIR / "issue_photos").mkdir(exist_ok=True)
    (UPLOADS_DIR / "issue_videos").mkdir(exist_ok=True)
    (UPLOADS_DIR / "issue_audio").mkdir(exist_ok=True)
    (UPLOADS_DIR / "gallery_photos").mkdir(exist_ok=True)
    (UPLOADS_DIR / "gallery_videos").mkdir(exist_ok=True)
    (UPLOADS_DIR / "gallery_audio").mkdir(exist_ok=True)
    # Prod/Vercel : pas de StaticFiles public — lecture via /api/media/proxy (auth + ACL).
    if not IS_PRODUCTION:
        app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

    @app.get("/health", tags=["health"])
    @app.get("/api/health", tags=["health"])
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
    app.include_router(
        task_gallery_controller.router, prefix="/api/task-gallery", tags=["task-gallery"]
    )
    app.include_router(issue_report_controller.router, prefix="/api/issue-reports", tags=["issue-reports"])
    app.include_router(dashboard_controller.router, prefix="/api/dashboard", tags=["dashboard"])
    app.include_router(events_controller.router, prefix="/api/events", tags=["events"])
    app.include_router(notification_controller.router, prefix="/api/notifications", tags=["notifications"])
    app.include_router(
        employee_activity_controller.router,
        prefix="/api/employee-activity",
        tags=["employee-activity"],
    )
    app.include_router(ai_controller.router, prefix="/api/ai", tags=["ai"])
    app.include_router(cron_controller.router, prefix="/api/cron", tags=["cron"])
    app.include_router(media_controller.router, prefix="/api/media", tags=["media"])

    return app

app = create_app()
