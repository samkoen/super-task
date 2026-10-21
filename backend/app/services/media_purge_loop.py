"""Ménage des médias sans cron Vercel : au réveil de l'API, puis chaque heure."""
from __future__ import annotations

import asyncio
import logging

from app.db import session as db_session
from app.services.media_retention_service import bind_media_retention

logger = logging.getLogger(__name__)
PURGE_INTERVAL_S = 60 * 60


def run_media_purge_once() -> None:
    if db_session.SessionLocal is None:
        return
    db = db_session.SessionLocal()
    try:
        result = bind_media_retention(db).purge_due()
        db.commit()
        logger.info("media purge %s", result)
    except Exception:
        db.rollback()
        logger.exception("media purge failed")
    finally:
        db.close()


async def media_purge_loop() -> None:
    while True:
        await asyncio.to_thread(run_media_purge_once)
        await asyncio.sleep(PURGE_INTERVAL_S)
