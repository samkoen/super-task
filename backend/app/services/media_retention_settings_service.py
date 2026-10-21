"""Lecture et mise à jour du délai de conservation des médias."""
from __future__ import annotations

from app.domain.media_retention_policy import parse_retention_days
from app.domain.scope import ActorContext
from app.domain.task_scope import can_manage_tasks
from app.repositories.app_setting_repository import AppSettingRepository

_FORBIDDEN = "אין הרשאה לשנות את ההגדרות"


class MediaRetentionSettingsService:
    def __init__(self, repo: AppSettingRepository):
        self._repo = repo

    def read(self, actor: ActorContext) -> dict:
        self._assert_manager(actor)
        return {"retention_days": self._repo.media_retention_days()}

    def update(self, actor: ActorContext, raw: object) -> dict:
        self._assert_manager(actor)
        days = parse_retention_days(raw)
        self._repo.set_media_retention_days(days)
        return {"retention_days": days}

    def _assert_manager(self, actor: ActorContext) -> None:
        if not can_manage_tasks(actor):
            raise PermissionError(_FORBIDDEN)
