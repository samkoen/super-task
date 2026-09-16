"""Publication et lecture de la dernière version APK."""
from __future__ import annotations

import uuid

from app.domain import roles
from app.domain.app_release import (
    APK_CONTENT_TYPE,
    APK_FOLDER,
    is_newer_release,
    normalize_apk_content_type,
    parse_version_name,
    require_apk_filename,
    require_apk_size,
    require_apk_url,
    version_code_from_name,
)
from app.domain.scope import ActorContext
from app.db import mappers as mp
from app.repositories.app_release_repository import AppReleaseRepository
from app.services import blob_storage
from app.services.video_direct_upload_service import should_use_direct_put_intent


class AppReleaseService:
    def __init__(self, repo: AppReleaseRepository):
        self._repo = repo

    def latest_for_client(self) -> dict:
        release = self._repo.find_latest()
        if not release:
            return {"available": False}
        return {
            "available": True,
            "version_code": release.version_code,
            "version_name": release.version_name,
            "download_url": self._download_url(release.apk_url),
        }

    def list_for_admin(self, actor: ActorContext) -> list[dict]:
        self._require_admin(actor)
        return [mp.app_release_domain_to_api(item) for item in self._repo.list_recent()]

    def create_upload_intent(self, actor: ActorContext, size_bytes: object) -> dict:
        self._require_admin(actor)
        if not should_use_direct_put_intent():
            return {"mode": "proxy"}
        size = require_apk_size(size_bytes)
        key = f"{APK_FOLDER}/{uuid.uuid4().hex}.apk"
        put_url = blob_storage.presign_put_url(key, APK_CONTENT_TYPE, size)
        return {
            "mode": "direct",
            "putUrl": put_url,
            "headers": {"Content-Type": APK_CONTENT_TYPE},
            "url": blob_storage.object_url_for_key(key),
            "pathname": key,
        }

    def upload_proxy(
        self, actor: ActorContext, data: bytes, filename: str, content_type: str
    ) -> dict:
        self._require_admin(actor)
        require_apk_filename(filename)
        require_apk_size(len(data or b""))
        normalize_apk_content_type(content_type)
        url = blob_storage.put_bytes(
            folder=APK_FOLDER,
            data=data,
            ext=".apk",
            content_type=APK_CONTENT_TYPE,
        )
        return {"url": url}

    def publish(
        self,
        actor: ActorContext,
        *,
        version_name: object,
        apk_url: str,
    ) -> dict:
        self._require_admin(actor)
        name = parse_version_name(version_name)
        code = version_code_from_name(name)
        url = require_apk_url(apk_url)
        self._assert_newer_than_latest(code)
        if not blob_storage.media_is_readable(url):
            raise ValueError("קובץ ה-APK לא נמצא")
        release = self._repo.create(
            version_code=code,
            version_name=name,
            apk_url=url,
            published_by_user_id=actor.user_id,
        )
        return mp.app_release_domain_to_api(release)

    def _assert_newer_than_latest(self, code: int) -> None:
        current = self._repo.find_latest()
        if current and not is_newer_release(current.version_code, code):
            raise ValueError("הגרסה חייבת להיות גבוהה יותר מהגרסה האחרונה")

    def _download_url(self, apk_url: str) -> str:
        signed = blob_storage.presign_get_url(apk_url)
        return signed or apk_url

    @staticmethod
    def _require_admin(actor: ActorContext) -> None:
        if actor.role != roles.ADMIN:
            raise PermissionError("למנהלי מערכת בלבד")
