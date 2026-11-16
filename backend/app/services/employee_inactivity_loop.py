"""Scan inactivité employés : au réveil de l'API, puis toutes les 15 min."""
from __future__ import annotations

import asyncio
import logging

from app.db import session as db_session
from app.domain.employee_inactivity import IDLE_MINUTES
from app.services.employee_activity_service import bind_employee_activity
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)
SCAN_INTERVAL_S = max(60, (IDLE_MINUTES * 60) // 2)


def run_inactivity_scan_once() -> None:
    if db_session.SessionLocal is None:
        return
    db = db_session.SessionLocal()
    try:
        _scan_commit_and_notify(db)
    except Exception:
        db.rollback()
        logger.exception("employee inactivity scan failed")
    finally:
        db.close()


def _scan_commit_and_notify(db) -> None:
    result = bind_employee_activity(db).run_inactivity_scan()
    pending = result.pop("pending", [])
    db.commit()
    NotificationService.push_task_event_sse(pending)
    logger.info("employee inactivity scan %s", result)


async def employee_inactivity_loop() -> None:
    while True:
        await asyncio.to_thread(run_inactivity_scan_once)
        await asyncio.sleep(SCAN_INTERVAL_S)
