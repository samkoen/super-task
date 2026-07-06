import asyncio
import json

from app.realtime.sse_hub import SSEHub


def test_sse_hub_publish_to_subscriber():
    async def run() -> None:
        hub = SSEHub()
        hub.bind_loop(asyncio.get_running_loop())
        queue = await hub.subscribe("branch:test")

        hub.publish_sync("branch:test", {"type": "task_created", "branch_id": "test"})
        payload = await asyncio.wait_for(queue.get(), timeout=1.0)
        assert json.loads(payload)["type"] == "task_created"

        await hub.unsubscribe("branch:test", queue)

    asyncio.run(run())
