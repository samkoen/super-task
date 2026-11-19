"""Liste שיחות oved (Figma « צ׳אט כללי · עובד »).

- `items` : chats de la משמרת en cours (tâches du jour avec au moins un message,
  plus les chats encore ouverts des jours précédents), triés du plus récent au plus ancien.
- `startable` : tâches du jour encore ouvertes sans aucun message — proposées dans le
  Bottom Sheet « צ׳אט חדש » (évite les chats en double).
- `archived_count` / archive : chats des משמרות précédentes déjà fermés.
"""
from __future__ import annotations

from app.domain import task_status
from app.domain.direct_chat import message_preview
from app.domain.manager_employee_chats import last_at_sort_key

# Avatar de la ligne (Task Avatar Figma : Video / Photo / Physical / Check / Cleaning).
VISUAL_VIDEO = "video"
VISUAL_PHOTO = "photo"
VISUAL_PHYSICAL = "physical"
VISUAL_CHECK = "check"
VISUAL_CLEANING = "cleaning"

# Chat Status Tag Figma.
CHAT_RETAKE = "retake"  # צלם שוב
CHAT_PENDING_REVIEW = "pending_review"  # ממתין לאישור
CHAT_AWAITING_UPLOAD = "awaiting_upload"  # ממתין להעלאה
CHAT_APPROVED = "approved"  # אושר

ARCHIVE_LIMIT = 100


def is_open_employee_chat_task(status: str) -> bool:
    return status not in task_status.TERMINAL


def chat_visual_kind(occurrence) -> str:
    kinds = {
        str((req or {}).get("kind") or "")
        for req in (getattr(occurrence, "completion_requirements", None) or [])
        if isinstance(req, dict)
    }
    if "video" in kinds or getattr(occurrence, "min_video_seconds", None):
        return VISUAL_VIDEO
    if "photo" in kinds or getattr(occurrence, "photo_required", False):
        return VISUAL_PHOTO
    category = getattr(occurrence, "ops_category", None)
    if category == "cleaning":
        return VISUAL_CLEANING
    if category in ("info_collection", "orders"):
        return VISUAL_CHECK
    return VISUAL_PHYSICAL


def chat_status_tag(occurrence, completion=None) -> str | None:
    status = getattr(occurrence, "status", None)
    if status == task_status.COMPLETED:
        return CHAT_APPROVED
    if status == task_status.CANCELLED:
        return None
    if status == task_status.PENDING_REVIEW:
        return CHAT_PENDING_REVIEW
    if getattr(occurrence, "awaiting_upload_at", None):
        return CHAT_AWAITING_UPLOAD
    review = getattr(completion, "manager_review_status", None) if completion else None
    if review == task_status.REVIEW_REJECTED:
        return CHAT_RETAKE
    return None


def employee_task_chat_card(
    occurrence,
    last_message=None,
    *,
    unread: int = 0,
    completion=None,
    viewer_id: str | None = None,
) -> dict:
    preview, last_at = _last_message_fields(last_message)
    sender = getattr(last_message, "sender_user_id", None) if last_message else None
    return {
        "id": occurrence.id,
        "title": occurrence.title,
        "status": occurrence.status,
        "due_at": getattr(occurrence, "due_at", None),
        "last_preview": preview,
        "last_at": last_at,
        "last_mine": bool(viewer_id and sender and str(sender) == str(viewer_id)),
        "unread_count": max(0, int(unread or 0)),
        "visual_kind": chat_visual_kind(occurrence),
        "chat_status": chat_status_tag(occurrence, completion),
    }


def split_employee_chats(all_chats: list[tuple], today: list) -> dict:
    """Répartit (occurrence, dernier message) entre משמרת en cours et archive.

    `all_chats` : tous les fils de l'oved ayant au moins un message (tous statuts).
    `today` : occurrences du jour assignées à l'oved.
    """
    today_ids = {occ.id for occ in today}
    current: list[tuple] = []
    archived: list[tuple] = []
    seen: set[str] = set()
    for occ, msg in all_chats:
        if occ.id in seen:
            continue
        seen.add(occ.id)
        live = is_open_employee_chat_task(occ.status)
        if live or (occ.id in today_ids and occ.status != task_status.CANCELLED):
            current.append((occ, msg))
        else:
            archived.append((occ, msg))
    startable = [
        occ for occ in today if occ.id not in seen and is_open_employee_chat_task(occ.status)
    ]
    return {"current": current, "archived": archived, "startable": startable}


def sort_employee_task_chats(items: list[dict]) -> list[dict]:
    return sorted(items, key=lambda item: last_at_sort_key(item.get("last_at")), reverse=True)


def _last_message_fields(last_message):
    if not last_message:
        return None, None
    preview = message_preview(
        last_message.body,
        last_message.photo_url,
        last_message.video_url,
        last_message.audio_url,
        getattr(last_message, "file_url", None),
    )
    return preview or None, last_message.created_at
