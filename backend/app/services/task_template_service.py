from datetime import datetime
from uuid import uuid4
from zoneinfo import ZoneInfo

from app.db import mappers as mp
from app.domain import roles, task_recurrence, task_status
from app.domain.network_fixed_task import (
    can_edit_network_fixed_group,
    grouped_network_ids,
    pick_first_employee,
    select_network_create_branches,
    siblings_by_content,
)
from app.domain.completion_media import packed_media_fields, parse_requirements_input
from app.domain.ops_category import normalize_ops_category
from app.domain.task_kind import FIXED
from app.domain.scope import ActorContext
from app.domain.task_scope import can_manage_tasks, visible_branch_ids_for_tasks
from app.domain.task_title_from_description import resolve_create_title
from app.domain.user_membership import employee_belongs_to_branch
from app.repositories.branch_repository import BranchRepository
from app.repositories.department_repository import DepartmentRepository
from app.repositories.task_template_repository import TaskTemplateRepository
from app.repositories.user_branch_membership_repository import UserBranchMembershipRepository
from app.repositories.user_repository import UserRepository
from app.services import blob_storage
from app.services.task_scheduler_service import TaskSchedulerService

TZ = ZoneInfo("Asia/Jerusalem")


class TaskTemplateService:
    def __init__(
        self,
        template_repo: TaskTemplateRepository,
        branch_repo: BranchRepository,
        department_repo: DepartmentRepository,
        user_repo: UserRepository,
        scheduler: TaskSchedulerService,
        occurrence_repo=None,
        completion_repo=None,
        notification_repo=None,
    ):
        self._templates = template_repo
        self._branch = branch_repo
        self._department = department_repo
        self._users = user_repo
        self._scheduler = scheduler
        self._occurrences = occurrence_repo
        self._completions = completion_repo
        self._notifications = notification_repo

    def list_templates(
        self, actor: ActorContext, *, branch_id: str | None = None
    ) -> list[dict]:
        if not can_manage_tasks(actor):
            raise PermissionError("אין הרשאה לצפות במשימות")
        branch_ids = visible_branch_ids_for_tasks(actor, self._branch)
        items = self._templates.list_templates(
            branch_ids=branch_ids, branch_id=branch_id, active_only=False
        )
        grouped = grouped_network_ids(self._scope_for_grouping(branch_ids, branch_id, items))
        return [self._to_api(t, is_network_task=t.id in grouped) for t in items]

    def _scope_for_grouping(self, branch_ids, branch_id, items) -> list:
        if not branch_id:
            return items
        return self._templates.list_templates(branch_ids=branch_ids, active_only=False)

    def create_template(
        self,
        actor: ActorContext,
        *,
        branch_id: str,
        title: str,
        description: str = "",
        recurrence: str = task_recurrence.ONCE,
        due_time: str = "23:59",
        weekly_days: str | None = None,
        monthly_day: int | None = None,
        assignee_user_id: str | None = None,
        department_id: str | None = None,
        due_at: str | None = None,
        reference_photo_url: str | None = None,
        reference_video_url: str | None = None,
        reference_audio_url: str | None = None,
        source_gallery_item_id: str | None = None,
        ops_category: str | None = None,
        min_video_seconds: int | None = None,
        completion_requirements: object | None = None,
        is_work_start: bool = False,
        network_group_id: str | None = None,
    ) -> dict:
        if not can_manage_tasks(actor):
            raise PermissionError("אין הרשאה ליצור משימות")
        self._validate_branch(actor, branch_id)
        self._validate_assignment(branch_id, assignee_user_id, department_id)
        title = resolve_create_title(title, description)
        if recurrence not in task_recurrence.RECURRING:
            raise ValueError("משימה קבועה דורשת חזרה יומית/שבועית/דו-שבועית/חודשית")
        if not assignee_user_id:
            raise ValueError("נדרש שיוך לעובד למשימה קבועה")
        if recurrence in {task_recurrence.WEEKLY, task_recurrence.BIWEEKLY} and not (weekly_days or "").strip():
            raise ValueError("נדרש יום בשבוע למשימה שבועית")
        parsed_monthly_day: int | None = None
        if recurrence == task_recurrence.MONTHLY:
            raw_day = monthly_day if monthly_day is not None else 1
            if not 1 <= int(raw_day) <= 31:
                raise ValueError("יום בחודש חייב להיות בין 1 ל-31")
            parsed_monthly_day = int(raw_day)

        category = normalize_ops_category(ops_category)
        media_fields = packed_media_fields(
            parse_requirements_input(
                completion_requirements,
                provided=completion_requirements is not None,
                min_video_seconds=min_video_seconds,
            )
        )
        work_start = bool(is_work_start)
        anchor = datetime.now(TZ) if recurrence == task_recurrence.BIWEEKLY else None
        photo, video, audio = self._isolate_external_media(
            reference_photo_url, reference_video_url, reference_audio_url
        )
        gallery_id = (source_gallery_item_id or "").strip() or None

        template = self._templates.create(
            branch_id=branch_id,
            title=title,
            description=description,
            recurrence=recurrence,
            due_time=due_time,
            weekly_days=weekly_days,
            monthly_day=parsed_monthly_day,
            assignee_user_id=assignee_user_id,
            department_id=department_id,
            created_by_id=actor.user_id,
            task_kind=FIXED,
            biweekly_anchor=anchor,
            reference_photo_url=photo,
            reference_video_url=video,
            reference_audio_url=audio,
            source_gallery_item_id=gallery_id,
            ops_category=category,
            is_work_start=work_start,
            network_group_id=network_group_id,
            **media_fields,
        )
        created_occurrence = None
        if recurrence in task_recurrence.RECURRING:
            created_occurrence = self._scheduler.generate_from_template(
                template, on_date=datetime.now(TZ).date()
            )
        result = self._to_api(template)
        if created_occurrence is not None:
            result["_created_occurrence"] = mp.task_occurrence_domain_to_api(created_occurrence)
        return result

    def create_templates_for_network(
        self,
        actor: ActorContext,
        *,
        title: str,
        description: str = "",
        recurrence: str = task_recurrence.ONCE,
        due_time: str = "23:59",
        weekly_days: str | None = None,
        monthly_day: int | None = None,
        reference_photo_url: str | None = None,
        reference_video_url: str | None = None,
        reference_audio_url: str | None = None,
        source_gallery_item_id: str | None = None,
        ops_category: str | None = None,
        min_video_seconds: int | None = None,
        completion_requirements: object | None = None,
        is_work_start: bool = False,
        branch_ids: list[str] | None = None,
    ) -> dict:
        """Duplique une tâche קבועה (tous les snifim, ou une liste). 1er oved par snif."""
        if actor.role not in {roles.NETWORK_MANAGER, roles.ADMIN}:
            raise PermissionError("יצירה לכל הרשת למנהל רשת בלבד")
        branches = select_network_create_branches(
            self._network_branches(actor), branch_ids
        )
        if not branches:
            raise ValueError("אין סניפים ברשת")
        group_id = str(uuid4())
        created: list[dict] = []
        skipped: list[dict] = []
        for branch in branches:
            item = self._create_network_copy(
                actor,
                branch,
                title=title,
                description=description,
                recurrence=recurrence,
                due_time=due_time,
                weekly_days=weekly_days,
                monthly_day=monthly_day,
                reference_photo_url=reference_photo_url,
                reference_video_url=reference_video_url,
                reference_audio_url=reference_audio_url,
                source_gallery_item_id=source_gallery_item_id,
                ops_category=ops_category,
                min_video_seconds=min_video_seconds,
                completion_requirements=completion_requirements,
                is_work_start=is_work_start,
                network_group_id=group_id,
            )
            if item is None:
                skipped.append(
                    {
                        "branch_id": branch.id,
                        "branch_name": branch.name,
                        "reason": "אין עובד בסניף",
                    }
                )
            else:
                created.append(item)
        if not created:
            raise ValueError("לא נוצרו משימות — אין עובדים בסניפים")
        return {"templates": created, "skipped": skipped}

    def _create_network_copy(self, actor, branch, **fields) -> dict | None:
        employees = self._users.list_users(role=roles.EMPLOYEE, branch_ids=[branch.id])
        first = pick_first_employee(employees)
        if not first:
            return None
        return self.create_template(
            actor,
            branch_id=branch.id,
            assignee_user_id=first.id,
            **fields,
        )

    def _network_branches(self, actor: ActorContext) -> list:
        visible = visible_branch_ids_for_tasks(actor, self._branch)
        if visible is None:
            return self._branch.list_branches()
        if actor.network_id:
            return self._branch.list_branches(network_id=actor.network_id)
        return [b for bid in visible if (b := self._branch.find_by_id(bid))]

    def update_template(
        self,
        actor: ActorContext,
        template_id: str,
        *,
        title: str,
        description: str,
        due_time: str,
        weekly_days: str | None,
        assignee_user_id: str | None,
        department_id: str | None,
        is_active: bool,
        reference_photo_url: str | None = None,
        reference_video_url: str | None = None,
        reference_audio_url: str | None = None,
        ops_category: str | None = None,
        update_ops_category: bool = False,
        min_video_seconds: int | None = None,
        update_min_video_seconds: bool = False,
        completion_requirements: object | None = None,
        update_completion_requirements: bool = False,
        is_work_start: bool | None = None,
        apply_to_network: bool = False,
    ) -> dict:
        existing = self._require_editable_template(actor, template_id)
        payload = self._edit_payload(
            existing,
            title=title,
            description=description,
            due_time=due_time,
            weekly_days=weekly_days,
            is_active=is_active,
            reference_photo_url=reference_photo_url,
            reference_video_url=reference_video_url,
            reference_audio_url=reference_audio_url,
            ops_category=ops_category,
            update_ops_category=update_ops_category,
            min_video_seconds=min_video_seconds,
            update_min_video_seconds=update_min_video_seconds,
            completion_requirements=completion_requirements,
            update_completion_requirements=update_completion_requirements,
            is_work_start=is_work_start,
        )
        if apply_to_network:
            return self._update_network_group(
                actor, existing, payload, assignee_user_id, department_id
            )
        self._validate_assignment(existing.branch_id, assignee_user_id, department_id)
        updated = self._templates.update(
            existing.id,
            assignee_user_id=assignee_user_id,
            department_id=department_id,
            **payload,
        )
        assert updated is not None
        self._sync_open_occurrence_text(updated)
        return self._to_api(updated)

    def delete_template(
        self, actor: ActorContext, template_id: str, *, apply_to_network: bool = False
    ) -> dict:
        existing = self._require_editable_template(actor, template_id)
        if apply_to_network:
            if not can_edit_network_fixed_group(actor.role):
                raise PermissionError("מחיקה לכל הרשת למנהל רשת בלבד")
            targets = self._group_templates_in_scope(actor, existing)
        else:
            targets = [existing]
        cancelled: list[dict] = []
        for sibling in targets:
            cancelled.extend(self._purge_open_occurrences(sibling.id))
            if not self._templates.delete(sibling.id):
                raise ValueError("תבנית משימה לא נמצאה")
        return {"deleted_count": len(targets), "cancelled_occurrences": cancelled}

    def _sync_open_occurrence_text(self, template) -> None:
        """Propage titre, description et cases de clôture vers les occurrences ouvertes."""
        if not self._occurrences or not template:
            return
        open_statuses = {
            task_status.PENDING,
            task_status.OVERDUE,
            task_status.IN_PROGRESS,
        }
        guides = getattr(template, "completion_requirements", None) or []
        for occ in self._occurrences.list_by_template_id(template.id):
            if occ.status not in open_statuses:
                continue
            self._occurrences.update_title_description(
                occ.id, title=template.title, description=template.description
            )
            self._occurrences.update_completion_requirements(occ.id, guides)

    def _purge_open_occurrences(self, template_id: str) -> list[dict]:
        if not self._occurrences:
            return []
        events: list[dict] = []
        for occ in self._occurrences.list_by_template_id(template_id):
            if occ.status in task_status.TERMINAL:
                continue
            if self._completions:
                self._completions.delete_by_occurrence(occ.id)
            if self._notifications:
                self._notifications.clear_occurrence_links(occ.id)
            self._occurrences.delete(occ.id)
            events.append(
                {
                    "id": occ.id,
                    "branch_id": occ.branch_id,
                    "assignee_user_id": occ.assignee_user_id,
                    "title": occ.title,
                }
            )
        self._occurrences.clear_template_id(template_id)
        return events

    def _require_editable_template(self, actor: ActorContext, template_id: str):
        existing = self._templates.find_by_id(template_id)
        if not existing:
            raise ValueError("תבנית משימה לא נמצאה")
        if not can_manage_tasks(actor):
            raise PermissionError("אין הרשאה לערוך משימות")
        self._validate_branch(actor, existing.branch_id)
        return existing

    @staticmethod
    def _edit_media_fields(
        existing,
        *,
        min_video_seconds,
        update_min_video_seconds,
        completion_requirements,
        update_completion_requirements,
    ) -> dict:
        if update_completion_requirements:
            reqs = parse_requirements_input(completion_requirements, provided=True)
        elif update_min_video_seconds:
            reqs = parse_requirements_input(
                None,
                provided=False,
                photo_required=existing.photo_required,
                min_video_seconds=min_video_seconds,
            )
        else:
            reqs = existing.completion_requirements
            if reqs is None:
                reqs = parse_requirements_input(
                    None,
                    provided=False,
                    photo_required=existing.photo_required,
                    min_video_seconds=existing.min_video_seconds,
                )
            else:
                reqs = parse_requirements_input(reqs, provided=True)
        packed = packed_media_fields(reqs)
        packed["update_min_video_seconds"] = (
            update_min_video_seconds or update_completion_requirements
        )
        packed["update_completion_requirements"] = (
            update_completion_requirements or update_min_video_seconds
        )
        return packed

    @staticmethod
    def _edit_payload(existing, *, title, description, due_time, weekly_days, is_active,
                      reference_photo_url, reference_video_url, reference_audio_url,
                      ops_category, update_ops_category, min_video_seconds,
                      update_min_video_seconds, completion_requirements,
                      update_completion_requirements, is_work_start) -> dict:
        payload = {
            "title": title,
            "description": description,
            "due_time": due_time,
            "weekly_days": weekly_days,
            "is_active": is_active,
            "reference_photo_url": reference_photo_url,
            "reference_video_url": reference_video_url,
            "reference_audio_url": reference_audio_url,
            "ops_category": (
                normalize_ops_category(ops_category) if update_ops_category else existing.ops_category
            ),
            "update_ops_category": update_ops_category,
            "is_work_start": existing.is_work_start if is_work_start is None else bool(is_work_start),
        }
        payload.update(
            TaskTemplateService._edit_media_fields(
                existing,
                min_video_seconds=min_video_seconds,
                update_min_video_seconds=update_min_video_seconds,
                completion_requirements=completion_requirements,
                update_completion_requirements=update_completion_requirements,
            )
        )
        return payload

    def _update_network_group(
        self, actor, existing, payload: dict, assignee_user_id, department_id
    ) -> dict:
        if not can_edit_network_fixed_group(actor.role):
            raise PermissionError("עדכון לכל הרשת למנהל רשת בלבד")
        targets = self._group_templates_in_scope(actor, existing)
        primary = None
        for sibling in targets:
            keep = sibling.id != existing.id
            assignee = sibling.assignee_user_id if keep else assignee_user_id
            dept = sibling.department_id if keep else department_id
            if not keep:
                self._validate_assignment(sibling.branch_id, assignee, dept)
            updated = self._templates.update(
                sibling.id, assignee_user_id=assignee, department_id=dept, **payload
            )
            if updated:
                self._sync_open_occurrence_text(updated)
            if sibling.id == existing.id:
                primary = updated
        assert primary is not None
        result = self._to_api(primary)
        result["updated_count"] = len(targets)
        return result

    def _group_templates_in_scope(self, actor, existing) -> list:
        visible = visible_branch_ids_for_tasks(actor, self._branch)
        if existing.network_group_id:
            siblings = self._templates.list_by_network_group(existing.network_group_id)
            return self._visible_or_self(siblings, visible, existing)
        candidates = self._templates.list_templates(
            branch_ids=visible, active_only=False, task_kind=FIXED
        )
        return siblings_by_content(existing, candidates)

    @staticmethod
    def _visible_or_self(siblings, visible, existing) -> list:
        if visible is None:
            return siblings or [existing]
        in_scope = [s for s in siblings if s.branch_id in visible]
        return in_scope or [existing]

    @staticmethod
    def _isolate_external_media(
        photo: str | None, video: str | None, audio: str | None
    ) -> tuple[str | None, str | None, str | None]:
        def _copy(url: str | None, folder: str) -> str | None:
            if not url:
                return url
            if "issue_" not in url and "gallery_" not in url:
                return url
            return blob_storage.copy_media_url(url, folder=folder)

        return (
            _copy(photo, "task_photos"),
            _copy(video, "task_videos"),
            _copy(audio, "task_audio"),
        )

    def _validate_branch(self, actor: ActorContext, branch_id: str) -> None:
        branch = self._branch.find_by_id(branch_id)
        if not branch:
            raise ValueError("סניף לא נמצא")
        branch_ids = visible_branch_ids_for_tasks(actor, self._branch)
        if branch_ids is not None and branch_id not in branch_ids:
            raise PermissionError("אין הרשאה לסניף זה")

    def _validate_assignment(
        self, branch_id: str, assignee_user_id: str | None, department_id: str | None
    ) -> None:
        if assignee_user_id:
            user = self._users.find_by_id(assignee_user_id)
            if not user:
                raise ValueError("עובד לא שייך לסניף")
            member_ids = UserBranchMembershipRepository(self._users._db).list_branch_ids_for_user(
                user.id
            )
            if not employee_belongs_to_branch(
                primary_branch_id=user.branch_id,
                membership_branch_ids=member_ids,
                branch_id=branch_id,
            ):
                raise ValueError("עובד לא שייך לסניף")
        if department_id:
            department = self._department.find_by_id(department_id)
            if not department or department.branch_id != branch_id:
                raise ValueError("מחלקה לא שייכת לסניף")

    def _to_api(self, template, **extra) -> dict:
        branch = self._branch.find_by_id(template.branch_id)
        department_name = None
        if template.department_id:
            m = self._department.find_by_id(template.department_id)
            department_name = m.name if m else None
        assignee_name = None
        if template.assignee_user_id:
            u = self._users.find_by_id(template.assignee_user_id)
            assignee_name = u.full_name if u else None
        return mp.task_template_domain_to_api(
            template,
            branch_name=branch.name if branch else None,
            department_name=department_name,
            assignee_name=assignee_name,
            **extra,
        )
