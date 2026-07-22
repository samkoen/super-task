from datetime import datetime
from zoneinfo import ZoneInfo

from app.db import mappers as mp
from app.domain import task_recurrence
from app.domain.ops_category import normalize_ops_category
from app.domain.task_kind import FIXED
from app.domain.scope import ActorContext
from app.domain.task_scope import can_manage_tasks, visible_branch_ids_for_tasks
from app.domain.task_title_from_description import resolve_create_title
from app.repositories.branch_repository import BranchRepository
from app.repositories.department_repository import DepartmentRepository
from app.repositories.task_template_repository import TaskTemplateRepository
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
    ):
        self._templates = template_repo
        self._branch = branch_repo
        self._department = department_repo
        self._users = user_repo
        self._scheduler = scheduler

    def list_templates(
        self, actor: ActorContext, *, branch_id: str | None = None
    ) -> list[dict]:
        if not can_manage_tasks(actor):
            raise PermissionError("אין הרשאה לצפות במשימות")
        branch_ids = visible_branch_ids_for_tasks(actor, self._branch)
        items = self._templates.list_templates(branch_ids=branch_ids, branch_id=branch_id, active_only=False)
        return [self._to_api(t) for t in items]

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
    ) -> dict:
        existing = self._templates.find_by_id(template_id)
        if not existing:
            raise ValueError("תבנית משימה לא נמצאה")
        if not can_manage_tasks(actor):
            raise PermissionError("אין הרשאה לערוך משימות")
        self._validate_branch(actor, existing.branch_id)
        self._validate_assignment(existing.branch_id, assignee_user_id, department_id)
        category = (
            normalize_ops_category(ops_category) if update_ops_category else existing.ops_category
        )
        updated = self._templates.update(
            template_id,
            title=title,
            description=description,
            due_time=due_time,
            weekly_days=weekly_days,
            assignee_user_id=assignee_user_id,
            department_id=department_id,
            is_active=is_active,
            reference_photo_url=reference_photo_url,
            reference_video_url=reference_video_url,
            reference_audio_url=reference_audio_url,
            ops_category=category,
            update_ops_category=update_ops_category,
        )
        assert updated is not None
        return self._to_api(updated)

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
            if not user or user.branch_id != branch_id:
                raise ValueError("עובד לא שייך לסניף")
        if department_id:
            department = self._department.find_by_id(department_id)
            if not department or department.branch_id != branch_id:
                raise ValueError("מחלקה לא שייכת לסניף")

    def _to_api(self, template) -> dict:
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
        )
