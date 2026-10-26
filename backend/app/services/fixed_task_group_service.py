"""Tâches קבועות vues par tâche (et non par snif) + adaptations par snif."""
import re

from app.domain import task_recurrence
from app.domain.completion_media import packed_media_fields, parse_requirements_input
from app.domain.fixed_task_overrides import (
    group_defaults,
    local_attrs_allowed,
    next_overridden,
    overridden_of,
    preserve_overrides,
    reset_values,
    split_into_groups,
)
from app.domain.network_fixed_task import can_edit_network_fixed_group
from app.domain.scope import ActorContext
from app.domain.task_kind import FIXED
from app.domain.task_scope import can_manage_tasks, visible_branch_ids_for_tasks
from app.repositories.branch_repository import BranchRepository
from app.repositories.task_template_repository import TaskTemplateRepository
from app.services.task_template_service import TaskTemplateService

_TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
_GROUP_DROP = {
    "id", "branch_id", "assignee_user_id", "department_id", "overridden_fields",
    "created_by_id", "created_at", "updated_at", "biweekly_anchor",
}
_BRANCH_KEYS = (
    "due_time", "weekly_days", "is_active", "description", "start_url",
    "reference_photo_url", "reference_video_url", "reference_audio_url",
    "completion_requirements", "photo_required", "min_video_seconds",
)


class FixedTaskGroupService:
    def __init__(
        self,
        templates: TaskTemplateService,
        template_repo: TaskTemplateRepository,
        branch_repo: BranchRepository,
    ):
        self._templates = templates
        self._repo = template_repo
        self._branches = branch_repo

    # --- Lecture -----------------------------------------------------------

    def list_groups(self, actor: ActorContext, *, branch_id: str | None = None) -> list[dict]:
        self._ensure_can_manage(actor)
        visible = visible_branch_ids_for_tasks(actor, self._branches)
        items = self._repo.list_templates(
            branch_ids=visible, branch_id=branch_id, active_only=False, task_kind=FIXED
        )
        return [self._group_to_api(actor, members) for members in split_into_groups(items)]

    def get_group(self, actor: ActorContext, key: str) -> dict:
        return self._group_to_api(actor, self._members(actor, key))

    # --- Réglages généraux -------------------------------------------------

    def update_group(self, actor: ActorContext, key: str, payload: dict) -> dict:
        members = self._members(actor, key)
        fields = self._edit_fields(payload)
        if not members[0].network_group_id:
            return self._update_single(actor, members[0], fields, payload)
        if not can_edit_network_fixed_group(actor.role):
            raise PermissionError("עדכון הגדרות כלליות למנהל רשת בלבד")
        edit = self._templates.build_edit_payload(members[0], **fields)
        for sibling in members:
            self._write_member(sibling, preserve_overrides(edit, sibling))
        return self.get_group(actor, key)

    def _write_member(self, sibling, body: dict) -> None:
        updated = self._repo.update(
            sibling.id,
            assignee_user_id=sibling.assignee_user_id,
            department_id=sibling.department_id,
            **body,
        )
        if updated:
            self._templates.sync_open_occurrences(updated)

    def _update_single(self, actor, existing, fields: dict, payload: dict) -> dict:
        assignee = str(payload.get("assignee_user_id") or existing.assignee_user_id or "")
        if not assignee:
            raise ValueError("נדרש שיוך לעובד למשימה קבועה")
        self._templates.update_template(
            actor,
            existing.id,
            assignee_user_id=assignee,
            department_id=existing.department_id,
            **fields,
        )
        return self.get_group(actor, existing.id)

    # --- Adaptation d'un snif ---------------------------------------------

    def update_branch(
        self, actor: ActorContext, template_id: str, *, changes: dict, reset: list[str] | None = None
    ) -> dict:
        existing = self._templates.require_editable(actor, template_id)
        clean = self._clean_changes(existing, changes)
        if "assignee_user_id" in clean:
            self._check_assignee(existing, clean["assignee_user_id"])
        values = dict(clean)
        if existing.network_group_id:
            defaults = group_defaults(self._repo.list_by_network_group(existing.network_group_id))
            values.update(reset_values(defaults, reset or []))
            values["overridden_fields"] = next_overridden(existing, defaults, clean, reset or [])
        updated = self._repo.update_fields(existing.id, values)
        if updated is None:
            raise ValueError("תבנית משימה לא נמצאה")
        self._templates.sync_open_occurrences(updated)
        return self._branch_to_api(updated)

    def _check_assignee(self, existing, assignee: str | None) -> None:
        if not assignee:
            raise ValueError("נדרש שיוך לעובד למשימה קבועה")
        self._templates.validate_assignment(existing.branch_id, assignee, existing.department_id)

    def _clean_changes(self, existing, changes: dict) -> dict:
        unknown = set(changes) - local_attrs_allowed()
        if unknown:
            raise ValueError("שדה לא ניתן להתאמה בסניף")
        clean = dict(changes)
        if "due_time" in clean and not _TIME_RE.match(str(clean["due_time"] or "")):
            raise ValueError("שעה לא תקינה")
        if "weekly_days" in clean:
            clean["weekly_days"] = task_recurrence.stored_weekly_days(
                existing.recurrence, clean["weekly_days"]
            )
        return self._pack_completion(clean)

    @staticmethod
    def _pack_completion(clean: dict) -> dict:
        """Les preuves se posent via `completion_requirements` ; les copies historiques en découlent."""
        if "completion_requirements" not in clean:
            if {"photo_required", "min_video_seconds"} & set(clean):
                raise ValueError("שדה לא ניתן להתאמה בסניף")
            return clean
        reqs = parse_requirements_input(clean["completion_requirements"], provided=True)
        return {**clean, **packed_media_fields(reqs)}

    # --- Mapping -----------------------------------------------------------

    def _members(self, actor: ActorContext, key: str) -> list:
        self._ensure_can_manage(actor)
        members = self._repo.list_by_network_group(key)
        if not members:
            single = self._repo.find_by_id(key)
            if not single or single.task_kind != FIXED:
                raise ValueError("תבנית משימה לא נמצאה")
            members = [single]
        visible = visible_branch_ids_for_tasks(actor, self._branches)
        in_scope = [m for m in members if visible is None or m.branch_id in visible]
        if not in_scope:
            raise PermissionError("אין הרשאה לסניף זה")
        return sorted(in_scope, key=lambda t: (t.created_at or "", t.id))

    def _group_to_api(self, actor: ActorContext, members: list) -> dict:
        head = members[0]
        data = {k: v for k, v in head.to_dict().items() if k not in _GROUP_DROP}
        data.update(group_defaults(members))
        data["description"] = data.get("description") or ""
        branches = [self._branch_to_api(m) for m in members]
        data.update(
            key=head.network_group_id or head.id,
            network_group_id=head.network_group_id,
            is_network=bool(head.network_group_id),
            can_edit_defaults=self._can_edit_defaults(actor, head),
            branches=branches,
            template_ids=[m.id for m in members],
            branch_count=len(branches),
            active_count=sum(1 for b in branches if b["is_active"]),
            overridden_count=sum(1 for b in branches if b["overridden_fields"]),
            unassigned_count=sum(1 for b in branches if not b["assignee_user_id"]),
        )
        return data

    @staticmethod
    def _can_edit_defaults(actor: ActorContext, head) -> bool:
        if not head.network_group_id:
            return True
        return can_edit_network_fixed_group(actor.role)

    def _branch_to_api(self, template) -> dict:
        api = self._templates.to_api(template)
        out = {k: api.get(k) for k in _BRANCH_KEYS}
        out.update(
            template_id=template.id,
            branch_id=template.branch_id,
            branch_name=api.get("branch_name"),
            assignee_user_id=template.assignee_user_id,
            assignee_name=api.get("assignee_name"),
            overridden_fields=overridden_of(template),
            opened_by_delivery_note=bool(template.opened_by_delivery_note),
        )
        return out

    @staticmethod
    def _ensure_can_manage(actor: ActorContext) -> None:
        if not can_manage_tasks(actor):
            raise PermissionError("אין הרשאה לצפות במשימות")

    @staticmethod
    def _edit_fields(payload: dict) -> dict:
        title = str(payload.get("title") or "").strip()
        if not title:
            raise ValueError("נדרשת כותרת")
        def has(name: str) -> bool:
            return name in payload

        return {
            "title": title,
            "description": str(payload.get("description") or ""),
            "due_time": str(payload.get("due_time") or "23:59"),
            "weekly_days": payload.get("weekly_days"),
            "is_active": bool(payload.get("is_active", True)),
            "reference_photo_url": payload.get("reference_photo_url"),
            "reference_video_url": payload.get("reference_video_url"),
            "reference_audio_url": payload.get("reference_audio_url"),
            "ops_category": payload.get("ops_category"),
            "update_ops_category": has("ops_category"),
            "min_video_seconds": payload.get("min_video_seconds"),
            "update_min_video_seconds": has("min_video_seconds"),
            "completion_requirements": payload.get("completion_requirements"),
            "update_completion_requirements": has("completion_requirements"),
            "is_work_start": payload.get("is_work_start") if has("is_work_start") else None,
            "is_work_end": payload.get("is_work_end") if has("is_work_end") else None,
            "start_url": payload.get("start_url") if has("start_url") else None,
        }
