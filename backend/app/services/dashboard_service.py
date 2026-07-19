"""Dashboard aggregations for managers and employees."""
from __future__ import annotations

from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from app.db import mappers as mp
from app.domain import roles, task_status
from app.domain.health_rules import (
    aggregate_health,
    branch_health_from_counts,
    occurrence_health,
)
from app.domain.scope import ActorContext, assert_branch_visible
from app.domain.task_reference_media import merge_occurrence_reference_media
from app.domain.task_translation_source import task_source_language
from app.domain.task_scope import can_manage_tasks, visible_branch_ids_for_tasks
from app.models.task_occurrence import TaskOccurrence
from app.models.user import User
from app.repositories.branch_repository import BranchRepository
from app.repositories.department_repository import DepartmentRepository
from app.domain.manager_dashboard import (
    build_timeline_item,
    build_unfinished_item,
    sort_timeline_tasks,
    task_queue_bucket,
)
from app.repositories.task_completion_repository import TaskCompletionRepository
from app.repositories.task_occurrence_repository import TaskOccurrenceRepository
from app.repositories.task_template_repository import TaskTemplateRepository
from app.repositories.user_repository import UserRepository
from app.services.task_translation_service import TaskTranslationService

TZ = ZoneInfo("Asia/Jerusalem")
URGENT_EMPLOYEE_WINDOW = timedelta(hours=1)


def _parse_due_at(value: str) -> datetime:
    dt = datetime.fromisoformat(value)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=TZ)
    return dt


def _task_alert(
    occurrence: TaskOccurrence,
    *,
    alert_type: str,
    occurrence_repo: TaskOccurrenceRepository,
) -> dict:
    return {
        "type": alert_type,
        "occurrence_id": occurrence.id,
        "title": occurrence.title,
        "department_name": occurrence_repo.get_department_name(occurrence.department_id),
        "assignee_name": occurrence_repo.get_assignee_name(occurrence.assignee_user_id),
        "due_at": occurrence.due_at,
        "task_kind": occurrence.task_kind,
    }


def _count_by_status(tasks: list[TaskOccurrence]) -> dict[str, int]:
    counts = {
        "tasks_total": 0,
        "tasks_completed": 0,
        "tasks_pending": 0,
        "tasks_in_progress": 0,
        "tasks_overdue": 0,
        "tasks_cancelled": 0,
        "tasks_pending_review": 0,
    }
    for task in tasks:
        counts["tasks_total"] += 1
        if task.status == task_status.COMPLETED:
            counts["tasks_completed"] += 1
        elif task.status == task_status.PENDING:
            counts["tasks_pending"] += 1
        elif task.status == task_status.IN_PROGRESS:
            counts["tasks_in_progress"] += 1
        elif task.status == task_status.PENDING_REVIEW:
            counts["tasks_pending_review"] += 1
        elif task.status == task_status.OVERDUE:
            counts["tasks_overdue"] += 1
        elif task.status == task_status.CANCELLED:
            counts["tasks_cancelled"] += 1
    actionable = counts["tasks_total"] - counts["tasks_cancelled"]
    counts["completion_rate"] = (
        round(counts["tasks_completed"] / actionable, 2) if actionable else 1.0
    )
    return counts


class DashboardService:
    def __init__(
        self,
        occurrence_repo: TaskOccurrenceRepository,
        branch_repo: BranchRepository,
        department_repo: DepartmentRepository,
        user_repo: UserRepository,
        completion_repo: TaskCompletionRepository,
        translation_service: TaskTranslationService | None = None,
        template_repo: TaskTemplateRepository | None = None,
    ):
        self._occurrences = occurrence_repo
        self._branches = branch_repo
        self._departments = department_repo
        self._users = user_repo
        self._completions = completion_repo
        self._translations = translation_service
        self._templates = template_repo

    def manager_dashboard(
        self,
        actor: ActorContext,
        *,
        branch_id: str | None = None,
        due_on: str | None = None,
    ) -> dict:
        if not can_manage_tasks(actor):
            raise PermissionError("אין הרשאה ללוח הבקרה")

        now = datetime.now(TZ)
        self._occurrences.rollover_open_tasks_to_day(now.date(), now=now)
        self._occurrences.mark_overdue_before(now)
        day = date.fromisoformat(due_on) if due_on else now.date()

        resolved_branch_id = self._resolve_manager_branch(actor, branch_id)
        if resolved_branch_id:
            return self._branch_manager_dashboard(actor, resolved_branch_id, day, now)
        return self._network_overview_dashboard(actor, day, now)

    async def employee_dashboard(
        self,
        actor: ActorContext,
        *,
        due_on: str | None = None,
    ) -> dict:
        if actor.role != roles.EMPLOYEE:
            raise PermissionError("רק עובדים יכולים לראות לוח זה")
        if not actor.branch_id:
            raise ValueError("לעובד חסר שיוך לסניף")

        now = datetime.now(TZ)
        # Tâches non faites hier → deviennent des tâches d'aujourd'hui (due_at avance).
        self._occurrences.rollover_open_tasks_to_day(now.date(), now=now)
        self._occurrences.mark_overdue_before(now)
        day = date.fromisoformat(due_on) if due_on else now.date()

        all_assigned = self._occurrences.list_occurrences(
            branch_id=actor.branch_id,
            for_employee_user_id=actor.user_id,
        )
        tasks_today = self._occurrences.list_occurrences(
            branch_id=actor.branch_id,
            for_employee_user_id=actor.user_id,
            due_on=day,
        )

        user = self._users.find_by_id(actor.user_id)
        branch_name = self._occurrences.get_branch_name(actor.branch_id)

        in_progress = [t for t in all_assigned if t.status == task_status.IN_PROGRESS]
        pending_review = [t for t in tasks_today if t.status == task_status.PENDING_REVIEW]
        completed = [t for t in tasks_today if t.status == task_status.COMPLETED]
        counts = _count_by_status(tasks_today)

        urgent: list[TaskOccurrence] = []
        seen: set[str] = set()
        for task in sorted(
            [t for t in all_assigned if t.status in {task_status.OVERDUE, task_status.PENDING}],
            key=lambda t: t.due_at,
        ):
            if task.id in seen or task.status == task_status.IN_PROGRESS:
                continue
            due = _parse_due_at(task.due_at)
            is_urgent = (
                task.status == task_status.OVERDUE
                or task.task_kind == "ad_hoc"
                or (task.status == task_status.PENDING and due <= now + URGENT_EMPLOYEE_WINDOW)
            )
            if is_urgent:
                urgent.append(task)
                seen.add(task.id)

        today_open = [
            t for t in tasks_today
            if t.status in {task_status.PENDING, task_status.OVERDUE}
            and t.id not in seen
        ]

        progress = int(round(counts["completion_rate"] * 100))
        on_shift = len(in_progress) > 0
        language = user.preferred_language if user else "he"

        async def localize_cards(tasks: list[TaskOccurrence]) -> list[dict]:
            cards = [self._employee_task_card(t) for t in tasks]
            if self._translations:
                return await self._translations.apply_to_cards_translated(cards, language=language)
            return cards

        return {
            "due_on": day.isoformat(),
            "employee": {
                "id": actor.user_id,
                "full_name": user.full_name if user else "",
                "job_function": user.job_function if user else None,
                "branch_id": actor.branch_id,
                "branch_name": branch_name,
                "preferred_language": language,
            },
            "progress_percent": progress,
            "on_shift": on_shift,
            "counts": counts,
            "urgent_tasks": await localize_cards(urgent),
            "in_progress_tasks": await localize_cards(in_progress),
            "pending_review_tasks": await localize_cards(pending_review),
            "today_tasks": await localize_cards(today_open),
            "completed_tasks": await localize_cards(completed),
        }

    def _resolve_manager_branch(self, actor: ActorContext, branch_id: str | None) -> str | None:
        if actor.role == roles.BRANCH_MANAGER:
            if not actor.branch_id:
                raise ValueError("למנהל הסניף חסר שיוך לסניף")
            return actor.branch_id
        if branch_id:
            branch = self._branches.find_by_id(branch_id)
            if not branch:
                raise ValueError("סניף לא נמצא")
            assert_branch_visible(actor, branch.network_id, branch.id)
            return branch.id
        return None

    def _branch_manager_dashboard(
        self,
        actor: ActorContext,
        branch_id: str,
        day: date,
        now: datetime,
    ) -> dict:
        branch = self._branches.find_by_id(branch_id)
        if not branch:
            raise ValueError("סניף לא נמצא")
        assert_branch_visible(actor, branch.network_id, branch.id)

        tasks_today = self._occurrences.list_occurrences(branch_id=branch_id, due_on=day)
        overdue_branch = self._occurrences.list_occurrences(
            branch_id=branch_id, status=task_status.OVERDUE
        )

        counts = _count_by_status(tasks_today)
        urgent_pending = sum(
            1
            for t in tasks_today
            if t.status in {task_status.PENDING, task_status.IN_PROGRESS}
            and _parse_due_at(t.due_at) <= now + timedelta(hours=2)
        )
        health = branch_health_from_counts(
            overdue=len(overdue_branch),
            completion_rate=counts["completion_rate"],
            urgent_pending=urgent_pending,
        )

        departments = self._departments.list_departments(branch_id=branch_id)
        by_department = self._department_breakdown(tasks_today, departments, now)

        employees = self._users.list_users(role=roles.EMPLOYEE, branch_ids=[branch_id])
        completion_map = self._completions.find_by_occurrence_ids(
            [
                t.id
                for t in tasks_today
                if t.status in {task_status.COMPLETED, task_status.PENDING_REVIEW}
            ]
        )
        team = self._team_timelines(
            employees,
            tasks_today,
            overdue_branch,
            completion_map,
            day,
            now,
        )
        task_queues = self._task_queues(tasks_today, completion_map, now)
        unfinished = self._unfinished_tasks(overdue_branch, day, now)

        alerts = self._build_alerts(overdue_branch, tasks_today, now)

        return {
            "due_on": day.isoformat(),
            "branch": {
                "id": branch.id,
                "name": branch.name,
                "network_id": branch.network_id,
            },
            "health": health,
            "counts": {
                **counts,
                "employees_total": len(employees),
                "employees_active": sum(1 for m in team if m["is_active"]),
                "overdue_open": len(overdue_branch),
            },
            "by_department": by_department,
            "team": team,
            "task_queues": task_queues,
            "unfinished_tasks": unfinished,
            "recent_alerts": alerts[:10],
            "branches": None,
        }

    def _network_overview_dashboard(self, actor: ActorContext, day: date, now: datetime) -> dict:
        branch_ids = visible_branch_ids_for_tasks(actor, self._branches)
        if branch_ids is None:
            branch_ids = [b.id for b in self._branches.list_branches()]
        elif not branch_ids:
            branch_ids = []
        branches_summary = []
        all_alerts: list[dict] = []
        total_counts = _count_by_status([])

        for bid in branch_ids:
            branch = self._branches.find_by_id(bid)
            if not branch:
                continue
            tasks_today = self._occurrences.list_occurrences(branch_id=bid, due_on=day)
            overdue = self._occurrences.list_occurrences(branch_id=bid, status=task_status.OVERDUE)
            counts = _count_by_status(tasks_today)
            urgent_pending = sum(
                1
                for t in tasks_today
                if t.status in {task_status.PENDING, task_status.IN_PROGRESS}
                and _parse_due_at(t.due_at) <= now + timedelta(hours=2)
            )
            health = branch_health_from_counts(
                overdue=len(overdue),
                completion_rate=counts["completion_rate"],
                urgent_pending=urgent_pending,
            )
            branches_summary.append({
                "branch_id": bid,
                "name": branch.name,
                "health": health,
                "overdue": len(overdue),
                "pending": counts["tasks_pending"] + counts["tasks_in_progress"],
                "completion_rate": counts["completion_rate"],
            })
            for key in total_counts:
                if key != "completion_rate":
                    total_counts[key] += counts.get(key, 0)
            all_alerts.extend(self._build_alerts(overdue, tasks_today, now))

        actionable = total_counts["tasks_total"] - total_counts["tasks_cancelled"]
        total_counts["completion_rate"] = (
            round(total_counts["tasks_completed"] / actionable, 2) if actionable else 1.0
        )
        health = branch_health_from_counts(
            overdue=total_counts["tasks_overdue"],
            completion_rate=total_counts["completion_rate"],
            urgent_pending=0,
        )

        return {
            "due_on": day.isoformat(),
            "branch": None,
            "health": health,
            "counts": {
                **total_counts,
                "employees_total": 0,
                "employees_active": 0,
                "overdue_open": total_counts["tasks_overdue"],
            },
            "by_department": None,
            "team": None,
            "task_queues": None,
            "unfinished_tasks": None,
            "recent_alerts": sorted(all_alerts, key=lambda a: a["due_at"])[:15],
            "branches": branches_summary,
        }

    def _department_breakdown(
        self,
        tasks: list[TaskOccurrence],
        departments,
        now: datetime,
    ) -> list[dict]:
        dept_map = {d.id: d for d in departments}
        buckets: dict[str | None, list[TaskOccurrence]] = {d.id: [] for d in departments}
        buckets[None] = []

        for task in tasks:
            key = task.department_id if task.department_id in dept_map else None
            buckets.setdefault(key, []).append(task)

        result = []
        ordered = sorted(departments, key=lambda d: (d.sort_order, d.name))
        for dept in ordered:
            result.append(self._department_row(dept.id, dept.name, dept.sort_order, buckets.get(dept.id, []), now))
        if buckets.get(None):
            result.append(self._department_row(None, "ללא מחלקה", 999, buckets[None], now))
        return result

    def _department_row(
        self,
        department_id: str | None,
        name: str,
        sort_order: int,
        tasks: list[TaskOccurrence],
        now: datetime,
    ) -> dict:
        counts = _count_by_status(tasks)
        levels = [
            occurrence_health(status=t.status, due_at=_parse_due_at(t.due_at), now=now)
            for t in tasks
            if t.status not in task_status.TERMINAL
        ]
        return {
            "department_id": department_id,
            "name": name,
            "sort_order": sort_order,
            "health": aggregate_health(levels),
            "pending": counts["tasks_pending"],
            "in_progress": counts["tasks_in_progress"],
            "overdue": counts["tasks_overdue"],
            "completed": counts["tasks_completed"],
            "total": counts["tasks_total"] - counts["tasks_cancelled"],
            "completion_rate": counts["completion_rate"],
        }

    def _team_timelines(
        self,
        employees: list[User],
        tasks_today: list[TaskOccurrence],
        overdue_branch: list[TaskOccurrence],
        completion_map: dict,
        day: date,
        now: datetime,
    ) -> list[dict]:
        by_assignee: dict[str, list[TaskOccurrence]] = {}
        for task in tasks_today:
            if task.assignee_user_id:
                by_assignee.setdefault(task.assignee_user_id, []).append(task)

        overdue_by_assignee: dict[str, list[TaskOccurrence]] = {}
        for task in overdue_branch:
            if not task.assignee_user_id:
                continue
            if _parse_due_at(task.due_at).date() >= day:
                continue
            overdue_by_assignee.setdefault(task.assignee_user_id, []).append(task)

        team = []
        for emp in employees:
            emp_tasks = by_assignee.get(emp.id, [])
            sorted_tasks = sort_timeline_tasks(emp_tasks, TZ)
            in_progress = next((t for t in emp_tasks if t.status == task_status.IN_PROGRESS), None)
            completed_today = sum(1 for t in emp_tasks if t.status == task_status.COMPLETED)
            total_today = sum(1 for t in emp_tasks if t.status != task_status.CANCELLED)
            is_active = in_progress is not None or completed_today > 0
            current_department = None
            if in_progress:
                current_department = self._occurrences.get_department_name(in_progress.department_id)

            timeline = [
                build_timeline_item(
                    task,
                    now=now,
                    tz=TZ,
                    completion=completion_map.get(task.id),
                    department_name=self._occurrences.get_department_name(task.department_id),
                    assignee_name=emp.full_name,
                )
                for task in sorted_tasks
            ]
            backlog = [
                build_timeline_item(
                    task,
                    now=now,
                    tz=TZ,
                    completion=completion_map.get(task.id),
                    department_name=self._occurrences.get_department_name(task.department_id),
                    assignee_name=emp.full_name,
                )
                for task in sorted(overdue_by_assignee.get(emp.id, []), key=lambda t: t.due_at)
            ]

            team.append({
                "user_id": emp.id,
                "full_name": emp.full_name,
                "job_function": emp.job_function,
                "is_active": is_active,
                "status": "in_progress" if in_progress else ("active" if is_active else "idle"),
                "current_task_title": in_progress.title if in_progress else None,
                "current_department_name": current_department,
                "completed_today": completed_today,
                "total_today": total_today,
                "open_tasks": sum(1 for t in emp_tasks if t.status in task_status.ACTIVE),
                "timeline": timeline,
                "overdue_backlog": backlog,
            })
        team.sort(key=lambda m: (not m["is_active"], m["full_name"]))
        return team

    def _task_queues(
        self,
        tasks_today: list[TaskOccurrence],
        completion_map: dict,
        now: datetime,
    ) -> dict[str, list[dict]]:
        completed: list[dict] = []
        in_progress: list[dict] = []
        pending_review: list[dict] = []
        upcoming: list[dict] = []

        buckets = {
            "completed": completed,
            "in_progress": in_progress,
            "pending_review": pending_review,
            "upcoming": upcoming,
        }
        for task in tasks_today:
            bucket = task_queue_bucket(task.status)
            if not bucket:
                continue
            item = build_timeline_item(
                task,
                now=now,
                tz=TZ,
                completion=completion_map.get(task.id),
                department_name=self._occurrences.get_department_name(task.department_id),
                assignee_name=self._occurrences.get_assignee_name(task.assignee_user_id),
            )
            buckets[bucket].append(item)

        completed.sort(key=lambda i: i.get("completed_at") or i["due_at"])
        in_progress.sort(key=lambda i: i.get("started_at") or i["due_at"])
        pending_review.sort(key=lambda i: i.get("completed_at") or i["due_at"], reverse=True)
        upcoming.sort(key=lambda i: i["due_at"])
        return {
            "completed": completed,
            "in_progress": in_progress,
            "pending_review": pending_review,
            "upcoming": upcoming,
        }

    def _unfinished_tasks(
        self,
        overdue_branch: list[TaskOccurrence],
        day: date,
        now: datetime,
    ) -> list[dict]:
        items: list[dict] = []
        for task in sorted(overdue_branch, key=lambda t: t.due_at):
            items.append(
                build_unfinished_item(
                    task,
                    day=day,
                    tz=TZ,
                    department_name=self._occurrences.get_department_name(task.department_id),
                    assignee_name=self._occurrences.get_assignee_name(task.assignee_user_id),
                    pending_delegation=False,
                )
            )
        return items

    def _team_activity(
        self,
        employees: list[User],
        tasks_today: list[TaskOccurrence],
        now: datetime,
    ) -> list[dict]:
        by_assignee: dict[str, list[TaskOccurrence]] = {}
        for task in tasks_today:
            if task.assignee_user_id:
                by_assignee.setdefault(task.assignee_user_id, []).append(task)

        team = []
        for emp in employees:
            emp_tasks = by_assignee.get(emp.id, [])
            in_progress = next((t for t in emp_tasks if t.status == task_status.IN_PROGRESS), None)
            completed_today = sum(1 for t in emp_tasks if t.status == task_status.COMPLETED)
            is_active = in_progress is not None or completed_today > 0
            current_department = None
            if in_progress:
                current_department = self._occurrences.get_department_name(in_progress.department_id)
            team.append({
                "user_id": emp.id,
                "full_name": emp.full_name,
                "job_function": emp.job_function,
                "is_active": is_active,
                "status": "in_progress" if in_progress else ("active" if is_active else "idle"),
                "current_task_title": in_progress.title if in_progress else None,
                "current_department_name": current_department,
                "completed_today": completed_today,
                "open_tasks": sum(1 for t in emp_tasks if t.status in task_status.ACTIVE),
            })
        team.sort(key=lambda m: (not m["is_active"], m["full_name"]))
        return team

    def _build_alerts(
        self,
        overdue: list[TaskOccurrence],
        tasks_today: list[TaskOccurrence],
        now: datetime,
    ) -> list[dict]:
        alerts: list[dict] = []
        for task in overdue:
            alerts.append(_task_alert(task, alert_type="overdue", occurrence_repo=self._occurrences))
        for task in tasks_today:
            if task.status not in {task_status.PENDING, task_status.IN_PROGRESS}:
                continue
            if _parse_due_at(task.due_at) <= now + timedelta(hours=2):
                alerts.append(_task_alert(task, alert_type="due_soon", occurrence_repo=self._occurrences))
        return alerts

    def _with_reference_media(self, task: TaskOccurrence) -> TaskOccurrence:
        """Fusion lecture seule template → occurrence (URLs Blob incluses)."""
        if not task.template_id or not self._templates:
            return task
        template = self._templates.find_by_id(task.template_id)
        return merge_occurrence_reference_media(task, template)

    def _employee_task_card(self, task: TaskOccurrence) -> dict:
        task = self._with_reference_media(task)
        completion = self._completions.find_by_occurrence(task.id) if self._completions else None
        card = {
            "id": task.id,
            "title": task.title,
            "description": task.description,
            "due_at": task.due_at,
            "created_at": task.created_at,
            "status": task.status,
            "task_kind": task.task_kind,
            "photo_required": task.photo_required,
            "reference_photo_url": task.reference_photo_url,
            "reference_video_url": task.reference_video_url,
            "reference_audio_url": task.reference_audio_url,
            "department_name": self._occurrences.get_department_name(task.department_id),
            "started_at": task.started_at,
        }
        if completion:
            card["completion"] = mp.task_completion_domain_to_api(completion)
        card["source_language"] = task_source_language(task, self._users)
        return card
