"""Task change notifications over SSE."""
from __future__ import annotations

from typing import Any

from app.domain import roles
from app.domain.scope import ActorContext
from app.realtime.sse_hub import sse_hub
from app.repositories.branch_repository import BranchRepository


def channels_for_actor(actor: ActorContext, branch_repo: BranchRepository) -> list[str]:
    channels = {f"user:{actor.user_id}"}
    if actor.branch_id:
        channels.add(f"branch:{actor.branch_id}")
    if actor.role == roles.NETWORK_MANAGER and actor.network_id:
        for branch in branch_repo.list_branches(network_id=actor.network_id):
            channels.add(f"branch:{branch.id}")
    if actor.role == roles.ADMIN:
        for branch in branch_repo.list_branches():
            channels.add(f"branch:{branch.id}")
    return sorted(channels)


def notify_task_change(
    *,
    event_type: str,
    branch_id: str,
    assignee_user_id: str | None = None,
    occurrence_id: str | None = None,
    status: str | None = None,
) -> None:
    branch_id = str(branch_id or "").strip()
    if not branch_id:
        return
    event: dict[str, Any] = {
        "type": event_type,
        "branch_id": branch_id,
    }
    if occurrence_id:
        event["occurrence_id"] = str(occurrence_id)
    if assignee_user_id:
        event["assignee_user_id"] = str(assignee_user_id)
    if status:
        event["status"] = status

    channels = [f"branch:{branch_id}"]
    if assignee_user_id:
        channels.append(f"user:{str(assignee_user_id)}")
    sse_hub.publish_many_sync(channels, event)
