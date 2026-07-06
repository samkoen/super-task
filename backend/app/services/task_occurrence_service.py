from datetime import date, datetime
from zoneinfo import ZoneInfo

from app.db import mappers as mp
from app.domain import roles, task_recurrence, task_status
from app.domain.scope import ActorContext
from app.domain.task_kind import AD_HOC, FIXED
from app.domain.task_scope import (
    branch_manager_owns_delegation,
    can_manage_tasks,
    employee_can_see_occurrence,
    visible_branch_ids_for_tasks,
)
from app.repositories.branch_repository import BranchRepository
from app.repositories.task_completion_repository import TaskCompletionRepository
from app.repositories.task_occurrence_repository import TaskOccurrenceRepository
from app.repositories.user_repository import UserRepository

TZ = ZoneInfo("Asia/Jerusalem")


class TaskOccurrenceService:
    def __init__(
        self,
        occurrence_repo: TaskOccurrenceRepository,
        completion_repo: TaskCompletionRepository,
        branch_repo: BranchRepository,
        user_repo: UserRepository | None = None,
    ):
        self._occurrences = occurrence_repo
        self._completions = completion_repo
        self._branch = branch_repo
        self._users = user_repo

    def list_occurrences(
        self,
        actor: ActorContext,
        *,
        branch_id: str | None = None,
        status: str | None = None,
        due_on: str | None = None,
        pending_delegation: bool | None = None,
        task_kind: str | None = None,
    ) -> list[dict]:
        if not can_manage_tasks(actor):
            raise PermissionError("אין הרשאה לצפות במשימות")
        branch_ids = visible_branch_ids_for_tasks(actor, self._branch)
        day = date.fromisoformat(due_on) if due_on else None
        items = self._occurrences.list_occurrences(
            branch_ids=branch_ids,
            branch_id=branch_id,
            status=status,
            due_on=day,
            pending_delegation=pending_delegation,
            task_kind=task_kind,
            manager_user_id=actor.user_id
            if pending_delegation and actor.role == roles.BRANCH_MANAGER
            else None,
        )
        return [self._to_api(o) for o in items]

    def list_mine(self, actor: ActorContext, *, due_on: str | None = None) -> list[dict]:
        if actor.role != roles.EMPLOYEE:
            raise PermissionError("רק עובדים יכולים לראות את המשימות שלהם")
        day = date.fromisoformat(due_on) if due_on else datetime.now(TZ).date()
        items = self._occurrences.list_occurrences(
            branch_id=actor.branch_id,
            for_employee_user_id=actor.user_id,
            due_on=day,
        )
        return [self._to_api(o) for o in items]

    def create_ad_hoc(
        self,
        actor: ActorContext,
        *,
        branch_id: str,
        title: str,
        description: str = "",
        due_at: str,
        assignee_user_id: str | None = None,
        photo_required: bool = True,
    ) -> dict:
        if not can_manage_tasks(actor):
            raise PermissionError("אין הרשאה ליצור משימות")
        if not (title or "").strip():
            raise ValueError("נדרש כותרת משימה")
        self._assert_branch_access(actor, branch_id)

        parsed = datetime.fromisoformat(due_at)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=TZ)

        manager_user_id: str | None = None
        final_assignee = assignee_user_id

        if actor.role == roles.NETWORK_MANAGER:
            if not self._users:
                raise RuntimeError("user repository required")
            branch_manager = self._users.find_by_branch_and_role(branch_id, roles.BRANCH_MANAGER)
            if not branch_manager:
                raise ValueError("לא נמצא מנהל סניף לסניף זה")
            manager_user_id = branch_manager.id
            final_assignee = None
        elif actor.role == roles.BRANCH_MANAGER:
            if assignee_user_id:
                self._validate_employee(branch_id, assignee_user_id)
            else:
                raise ValueError("נדרש שיוך לעובד למשימה מזדמנת")

        occurrence = self._occurrences.create(
            template_id=None,
            branch_id=branch_id,
            title=title,
            description=description,
            due_at=parsed,
            assignee_user_id=final_assignee,
            department_id=None,
            task_kind=AD_HOC,
            manager_user_id=manager_user_id,
            photo_required=photo_required,
            created_by_id=actor.user_id,
        )
        return self._to_api(occurrence)

    def delegate_occurrence(
        self, actor: ActorContext, occurrence_id: str, *, assignee_user_id: str
    ) -> dict:
        occurrence = self._occurrences.find_by_id(occurrence_id)
        if not occurrence:
            raise ValueError("משימה לא נמצאה")
        if actor.role != roles.BRANCH_MANAGER:
            raise PermissionError("רק מנהל סניף יכול להעביר משימות")
        if not branch_manager_owns_delegation(actor, manager_user_id=occurrence.manager_user_id):
            raise PermissionError("אין הרשאה להעביר משימה זו")
        if not occurrence.pending_delegation:
            raise ValueError("המשימה כבר שויכה לעובד")
        self._validate_employee(occurrence.branch_id, assignee_user_id)
        updated = self._occurrences.delegate(occurrence_id, assignee_user_id=assignee_user_id)
        assert updated is not None
        return self._to_api(updated)

    def start_occurrence(self, actor: ActorContext, occurrence_id: str) -> dict:
        occurrence = self._occurrences.find_by_id(occurrence_id)
        if not occurrence:
            raise ValueError("משימה לא נמצאה")
        if actor.role != roles.EMPLOYEE:
            raise PermissionError("רק עובדים יכולים להתחיל משימות")
        if not employee_can_see_occurrence(
            actor, assignee_user_id=occurrence.assignee_user_id, branch_id=occurrence.branch_id
        ):
            raise PermissionError("אין הרשאה לבצע משימה זו")
        if occurrence.status not in {task_status.PENDING, task_status.OVERDUE}:
            raise ValueError("ניתן להתחיל רק משימה במצב ממתין או באיחור")
        updated = self._occurrences.start(
            occurrence_id, started_by_id=actor.user_id, started_at=datetime.now(TZ)
        )
        assert updated is not None
        return self._to_api(updated)

    def complete_occurrence(
        self,
        actor: ActorContext,
        occurrence_id: str,
        *,
        completion_status: str,
        note: str | None = None,
        photo_path: str | None = None,
        video_path: str | None = None,
        audio_path: str | None = None,
        not_completed_reason: str | None = None,
    ) -> dict:
        occurrence = self._occurrences.find_by_id(occurrence_id)
        if not occurrence:
            raise ValueError("משימה לא נמצאה")
        self._assert_can_complete(actor, occurrence)
        if occurrence.status in task_status.TERMINAL:
            raise ValueError("המשימה כבר נסגרה")
        if actor.role == roles.EMPLOYEE and occurrence.status != task_status.IN_PROGRESS:
            raise ValueError("יש להתחיל את המשימה לפני הסיום")
        if completion_status not in {task_status.COMPLETION_DONE, task_status.COMPLETION_NOT_DONE}:
            raise ValueError("סטטוס סיום לא תקין")
        if completion_status == task_status.COMPLETION_NOT_DONE and not (not_completed_reason or "").strip():
            raise ValueError("נדרשת סיבה אם המשימה לא בוצעה")
        if (
            occurrence.photo_required
            and completion_status == task_status.COMPLETION_DONE
            and not any((p or "").strip() for p in (photo_path, video_path, audio_path))
        ):
            raise ValueError("נדרש לפחות קובץ מדיה (תמונה, וידאו או שמע) למשימה מזדמנת")

        completion = self._completions.create(
            occurrence_id=occurrence_id,
            status=completion_status,
            note=(note or "").strip() or None,
            photo_path=photo_path,
            video_path=video_path,
            audio_path=audio_path,
            not_completed_reason=(not_completed_reason or "").strip() or None,
            completed_by_id=actor.user_id,
        )
        new_status = (
            task_status.COMPLETED
            if completion_status == task_status.COMPLETION_DONE
            else task_status.CANCELLED
        )
        updated = self._occurrences.update_status(occurrence_id, new_status)
        assert updated is not None
        data = self._to_api(updated)
        data["completion"] = mp.task_completion_domain_to_api(completion)
        return data

    def cancel_occurrence(self, actor: ActorContext, occurrence_id: str) -> dict:
        if not can_manage_tasks(actor):
            raise PermissionError("אין הרשאה לבטל משימות")
        occurrence = self._occurrences.find_by_id(occurrence_id)
        if not occurrence:
            raise ValueError("משימה לא נמצאה")
        self._assert_branch_access(actor, occurrence.branch_id)
        if occurrence.status in task_status.TERMINAL:
            raise ValueError("המשימה כבר נסגרה")
        updated = self._occurrences.update_status(occurrence_id, task_status.CANCELLED)
        assert updated is not None
        return self._to_api(updated)

    def _assert_branch_access(self, actor: ActorContext, branch_id: str) -> None:
        branch_ids = visible_branch_ids_for_tasks(actor, self._branch)
        if branch_ids is not None and branch_id not in branch_ids:
            raise PermissionError("אין הרשאה לסניף זה")

    def _validate_employee(self, branch_id: str, assignee_user_id: str) -> None:
        if not self._users:
            raise RuntimeError("user repository required")
        user = self._users.find_by_id(assignee_user_id)
        if not user or user.role != roles.EMPLOYEE or user.branch_id != branch_id:
            raise ValueError("עובד לא שייך לסניף")

    def _assert_can_complete(self, actor: ActorContext, occurrence) -> None:
        if can_manage_tasks(actor):
            self._assert_branch_access(actor, occurrence.branch_id)
            return
        if not employee_can_see_occurrence(
            actor, assignee_user_id=occurrence.assignee_user_id, branch_id=occurrence.branch_id
        ):
            raise PermissionError("אין הרשאה לבצע משימה זו")

    def _to_api(self, occurrence) -> dict:
        completion = self._completions.find_by_occurrence(occurrence.id)
        return mp.task_occurrence_domain_to_api(
            occurrence,
            branch_name=self._occurrences.get_branch_name(occurrence.branch_id),
            department_name=self._occurrences.get_department_name(occurrence.department_id),
            assignee_name=self._occurrences.get_assignee_name(occurrence.assignee_user_id),
            manager_name=self._occurrences.get_manager_name(occurrence.manager_user_id),
            completion=mp.task_completion_domain_to_api(completion) if completion else None,
        )
