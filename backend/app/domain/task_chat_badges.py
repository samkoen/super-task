"""Badges d'une ligne de chat de tâche (Figma Chat Row), communs oved et menahel."""
from __future__ import annotations

from app.domain import task_status

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
