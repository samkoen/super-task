"""In-memory SSE pub/sub (single-process)."""
from __future__ import annotations

import asyncio
import json
import logging
from collections import defaultdict
from typing import Any

logger = logging.getLogger(__name__)


class SSEHub:
    def __init__(self) -> None:
        self._subscribers: dict[str, set[asyncio.Queue[str]]] = defaultdict(set)
        self._loop: asyncio.AbstractEventLoop | None = None

    def bind_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    async def subscribe(self, channel: str) -> asyncio.Queue[str]:
        queue: asyncio.Queue[str] = asyncio.Queue(maxsize=64)
        self._subscribers[channel].add(queue)
        return queue

    async def unsubscribe(self, channel: str, queue: asyncio.Queue[str]) -> None:
        self._subscribers[channel].discard(queue)

    def publish_sync(self, channel: str, event: dict[str, Any]) -> None:
        loop = self._loop
        if loop is None or not loop.is_running():
            try:
                loop = asyncio.get_running_loop()
                self._loop = loop
            except RuntimeError:
                logger.warning("SSE publish skipped (loop not ready): channel=%s", channel)
                return
        subs = list(self._subscribers.get(channel, ()))
        if not subs:
            logger.debug("SSE publish to empty channel=%s type=%s", channel, event.get("type"))
            return
        payload = json.dumps(event, ensure_ascii=False)
        for queue in subs:
            loop.call_soon_threadsafe(self._enqueue, queue, payload)

    def publish_many_sync(self, channels: list[str], event: dict[str, Any]) -> None:
        for channel in set(channels):
            self.publish_sync(channel, event)

    @staticmethod
    def _enqueue(queue: asyncio.Queue[str], payload: str) -> None:
        try:
            queue.put_nowait(payload)
        except asyncio.QueueFull:
            pass


sse_hub = SSEHub()
