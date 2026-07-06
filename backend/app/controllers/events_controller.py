"""Server-Sent Events stream."""
from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.auth.actor import load_actor
from app.dependencies import get_db
from app.realtime.sse_hub import sse_hub
from app.realtime.task_events import channels_for_actor
from app.repositories.branch_repository import BranchRepository
from app.repositories.user_repository import UserRepository

router = APIRouter()

PING_SECONDS = 25


async def _next_event(queues: list[asyncio.Queue[str]]) -> str | None:
    tasks = [asyncio.create_task(q.get()) for q in queues]
    done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
    for task in pending:
        task.cancel()
    for task in done:
        return task.result()
    return None


@router.get("/stream")
async def stream_events(request: Request, db: Session = Depends(get_db)):
    actor = load_actor(request, UserRepository(db))
    branch_repo = BranchRepository(db)
    channels = channels_for_actor(actor, branch_repo)

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
                    yield ": ping\n\n"
                    continue
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
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
