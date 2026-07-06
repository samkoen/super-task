"""Server-Sent Events stream."""
from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.auth.actor import load_actor
from app.db.session import SessionLocal, get_engine
from app.realtime.sse_hub import sse_hub
from app.realtime.task_events import channels_for_actor
from app.repositories.branch_repository import BranchRepository
from app.repositories.user_repository import UserRepository

router = APIRouter()
logger = logging.getLogger(__name__)

PING_SECONDS = 25


async def _next_event(queues: list[asyncio.Queue[str]]) -> str | None:
    if not queues:
        return None
    tasks = [asyncio.create_task(q.get()) for q in queues]
    done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
    for task in pending:
        task.cancel()
    for task in done:
        return task.result()
    return None


def _resolve_stream_channels(request: Request) -> list[str]:
    """Short-lived DB session — do not hold a connection for the whole SSE stream."""
    get_engine()
    if SessionLocal is None:
        raise HTTPException(status_code=503, detail="מסד הנתונים לא זמין")
    db = SessionLocal()
    try:
        actor = load_actor(request, UserRepository(db))
        branch_repo = BranchRepository(db)
        return channels_for_actor(actor, branch_repo)
    finally:
        db.close()


@router.get("/stream")
async def stream_events(request: Request):
    channels = _resolve_stream_channels(request)

    async def generate():
        queues: list[asyncio.Queue[str]] = []
        for channel in channels:
            queues.append(await sse_hub.subscribe(channel))
        try:
            yield "event: connected\ndata: {}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    payload = await asyncio.wait_for(_next_event(queues), timeout=PING_SECONDS)
                except asyncio.TimeoutError:
                    yield "event: ping\ndata: {}\n\n"
                    continue
                except asyncio.CancelledError:
                    break
                except Exception:
                    logger.exception("SSE stream error")
                    break
                if payload is None:
                    continue
                yield f"event: task\ndata: {payload}\n\n"
        finally:
            for channel, queue in zip(channels, queues):
                await sse_hub.unsubscribe(channel, queue)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
