"""Galerie de modèles de tâches réutilisables."""
from __future__ import annotations

from app.domain import roles, task_recurrence
from app.domain.scope import ActorContext
from app.domain.task_gallery import (
    GALLERY_KINDS,
    gallery_item_visible,
    resolve_gallery_branch_id,
    resolve_gallery_network_id,
)
from app.domain.task_scope import can_manage_tasks, visible_branch_ids_for_tasks
from app.domain.task_title_from_description import resolve_create_title
from app.repositories.branch_repository import BranchRepository
from app.repositories.task_gallery_repository import TaskGalleryRepository
from app.repositories.task_occurrence_repository import TaskOccurrenceRepository
from app.repositories.task_template_repository import TaskTemplateRepository
from app.services import blob_storage

_GALLERY_FOLDERS = {
    "photo": "gallery_photos",
    "video": "gallery_videos",
    "audio": "gallery_audio",
}


class TaskGalleryService:
    def __init__(
        self,
        repo: TaskGalleryRepository,
        branch_repo: BranchRepository,
        occurrence_repo: TaskOccurrenceRepository,
        template_repo: TaskTemplateRepository,
    ):
        self._repo = repo
        self._branches = branch_repo
        self._occurrences = occurrence_repo
        self._templates = template_repo

    def list_items(
        self, actor: ActorContext, *, task_kind: str | None = None
    ) -> list[dict]:
        self._require_manager(actor)
        kind = (task_kind or "").strip() or None
        if kind and kind not in GALLERY_KINDS:
            raise ValueError("סוג משימה לא תקין")
        items = self._query_visible(actor, task_kind=kind)
        return [i.to_dict() for i in items]

    def create_item(self, actor: ActorContext, body: dict) -> dict:
        self._require_manager(actor)
        payload = self._normalize_create_payload(actor, body)
        item = self._repo.create(**payload, created_by_id=actor.user_id)
        return item.to_dict()

    def update_item(self, actor: ActorContext, item_id: str, body: dict) -> dict:
        self._require_manager(actor)
        item = self._get_visible(actor, item_id)
        payload = self._normalize_update_payload(actor, body)
        updated = self._repo.update(item.id, **payload)
        if not updated:
            raise ValueError("פריט גלריה לא נמצא")
        return updated.to_dict()

    def delete_item(self, actor: ActorContext, item_id: str) -> None:
        self._require_manager(actor)
        item = self._get_visible(actor, item_id)
        media = [
            item.reference_photo_url,
            item.reference_video_url,
            item.reference_audio_url,
        ]
        if not self._repo.delete(item.id):
            raise ValueError("פריט גלריה לא נמצא")
        for url in media:
            blob_storage.delete_media_url(url)

    def create_from_occurrence(self, actor: ActorContext, occurrence_id: str) -> dict:
        self._require_manager(actor)
        occurrence = self._occurrences.find_by_id(occurrence_id)
        if not occurrence:
            raise ValueError("משימה לא נמצאה")
        self._assert_branch_in_scope(actor, occurrence.branch_id)
        if occurrence.source_gallery_item_id:
            raise ValueError("משימה זו כבר מגיעה מהגלריה")
        if self._repo.find_by_source_occurrence_id(occurrence_id):
            raise ValueError("המשימה כבר נוספה לגלריה")
        return self.create_item(
            actor,
            {
                "branch_id": occurrence.branch_id,
                "title": occurrence.title,
                "description": occurrence.description,
                "task_kind": occurrence.task_kind
                if occurrence.task_kind in GALLERY_KINDS
                else "ad_hoc",
                "photo_required": occurrence.photo_required,
                "reference_photo_url": occurrence.reference_photo_url,
                "reference_video_url": occurrence.reference_video_url,
                "reference_audio_url": occurrence.reference_audio_url,
                "source_occurrence_id": occurrence_id,
            },
        )

    def create_from_template(self, actor: ActorContext, template_id: str) -> dict:
        self._require_manager(actor)
        template = self._templates.find_by_id(template_id)
        if not template:
            raise ValueError("תבנית לא נמצאה")
        self._assert_branch_in_scope(actor, template.branch_id)
        return self.create_item(
            actor,
            {
                "branch_id": template.branch_id,
                "title": template.title,
                "description": template.description,
                "task_kind": "fixed",
                "recurrence": template.recurrence,
                "due_time": template.due_time,
                "weekly_days": template.weekly_days,
                "monthly_day": template.monthly_day,
                "photo_required": template.photo_required,
                "reference_photo_url": template.reference_photo_url,
                "reference_video_url": template.reference_video_url,
                "reference_audio_url": template.reference_audio_url,
            },
        )

    def _normalize_create_payload(self, actor: ActorContext, body: dict) -> dict:
        title = resolve_create_title(body.get("title"), body.get("description"))
        task_kind = (body.get("task_kind") or "").strip()
        if task_kind not in GALLERY_KINDS:
            raise ValueError("סוג משימה לא תקין")
        branch_id = resolve_gallery_branch_id(actor, body.get("branch_id"))
        if branch_id:
            self._assert_branch_in_scope(actor, branch_id)
        if actor.role == roles.ADMIN:
            network_id = (body.get("network_id") or "").strip()
            if not network_id and branch_id:
                branch = self._branches.find_by_id(branch_id)
                network_id = branch.network_id if branch else ""
            if not network_id:
                raise ValueError("נדרש רשת או סניף")
        else:
            network_id = resolve_gallery_network_id(actor)
        photo, video, audio = self._isolate_to_gallery(
            body.get("reference_photo_url"),
            body.get("reference_video_url"),
            body.get("reference_audio_url"),
        )
        recurrence, due_time, weekly_days, monthly_day = self._fixed_fields(task_kind, body)
        return {
            "network_id": network_id,
            "branch_id": branch_id,
            "title": title,
            "description": (body.get("description") or "").strip(),
            "task_kind": task_kind,
            "recurrence": recurrence,
            "due_time": due_time,
            "weekly_days": weekly_days,
            "monthly_day": monthly_day,
            "photo_required": bool(body.get("photo_required", True)),
            "reference_photo_url": photo,
            "reference_video_url": video,
            "reference_audio_url": audio,
            "source_occurrence_id": (body.get("source_occurrence_id") or "").strip()
            or None,
        }

    def _normalize_update_payload(self, actor: ActorContext, body: dict) -> dict:
        title = resolve_create_title(body.get("title"), body.get("description"))
        task_kind = (body.get("task_kind") or "").strip()
        if task_kind not in GALLERY_KINDS:
            raise ValueError("סוג משימה לא תקין")
        branch_id = resolve_gallery_branch_id(actor, body.get("branch_id"))
        if branch_id:
            self._assert_branch_in_scope(actor, branch_id)
        photo, video, audio = self._isolate_to_gallery(
            body.get("reference_photo_url"),
            body.get("reference_video_url"),
            body.get("reference_audio_url"),
        )
        recurrence, due_time, weekly_days, monthly_day = self._fixed_fields(task_kind, body)
        return {
            "branch_id": branch_id,
            "title": title,
            "description": (body.get("description") or "").strip(),
            "task_kind": task_kind,
            "recurrence": recurrence,
            "due_time": due_time,
            "weekly_days": weekly_days,
            "monthly_day": monthly_day,
            "photo_required": bool(body.get("photo_required", True)),
            "reference_photo_url": photo,
            "reference_video_url": video,
            "reference_audio_url": audio,
        }

    @staticmethod
    def _fixed_fields(task_kind: str, body: dict):
        if task_kind != "fixed":
            return None, None, None, None
        recurrence = (body.get("recurrence") or task_recurrence.DAILY).strip()
        if recurrence not in task_recurrence.RECURRING:
            raise ValueError("חזרה לא תקינה למשימה קבועה")
        due_time = (body.get("due_time") or "09:00").strip()
        weekly_days = (body.get("weekly_days") or "").strip() or None
        monthly_day = body.get("monthly_day")
        if monthly_day is not None:
            monthly_day = int(monthly_day)
        return recurrence, due_time, weekly_days, monthly_day

    def _query_visible(self, actor: ActorContext, *, task_kind: str | None):
        branch_ids = visible_branch_ids_for_tasks(actor, self._branches)
        if actor.role == roles.ADMIN:
            return self._repo.list_items(task_kind=task_kind)
        if not actor.network_id:
            return []
        return self._repo.list_items(
            network_id=actor.network_id,
            branch_ids=branch_ids if branch_ids is not None else [],
            include_network_wide=True,
            task_kind=task_kind,
        )

    def _get_visible(self, actor: ActorContext, item_id: str):
        item = self._repo.find_by_id(item_id)
        if not item:
            raise ValueError("פריט גלריה לא נמצא")
        branch_ids = visible_branch_ids_for_tasks(actor, self._branches)
        if not gallery_item_visible(
            actor=actor,
            item_network_id=item.network_id,
            item_branch_id=item.branch_id,
            visible_branch_ids=branch_ids,
        ):
            raise PermissionError("אין הרשאה")
        return item

    def _assert_branch_in_scope(self, actor: ActorContext, branch_id: str) -> None:
        branch = self._branches.find_by_id(branch_id)
        if not branch:
            raise ValueError("סניף לא נמצא")
        branch_ids = visible_branch_ids_for_tasks(actor, self._branches)
        if branch_ids is not None and branch_id not in branch_ids:
            raise PermissionError("אין הרשאה לסניף זה")

    @staticmethod
    def _require_manager(actor: ActorContext) -> None:
        if not can_manage_tasks(actor):
            raise PermissionError("אין הרשאה")

    @staticmethod
    def _isolate_to_gallery(
        photo: str | None, video: str | None, audio: str | None
    ) -> tuple[str | None, str | None, str | None]:
        def _copy(url: str | None, folder: str) -> str | None:
            cleaned = (url or "").strip() or None
            if not cleaned:
                return None
            if "gallery_" in cleaned:
                return cleaned
            return blob_storage.copy_media_url(cleaned, folder=folder) or cleaned

        return (
            _copy(photo, _GALLERY_FOLDERS["photo"]),
            _copy(video, _GALLERY_FOLDERS["video"]),
            _copy(audio, _GALLERY_FOLDERS["audio"]),
        )
