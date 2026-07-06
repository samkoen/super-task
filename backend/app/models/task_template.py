from dataclasses import dataclass


@dataclass
class TaskTemplate:
    id: str
    branch_id: str
    title: str
    description: str
    recurrence: str
    due_time: str
    weekly_days: str | None
    assignee_user_id: str | None
    department_id: str | None
    task_kind: str
    photo_required: bool
    biweekly_anchor: str | None
    is_active: bool
    created_by_id: str
    created_at: str
    updated_at: str

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "branch_id": self.branch_id,
            "title": self.title,
            "description": self.description,
            "recurrence": self.recurrence,
            "due_time": self.due_time,
            "weekly_days": self.weekly_days,
            "assignee_user_id": self.assignee_user_id,
            "department_id": self.department_id,
            "task_kind": self.task_kind,
            "photo_required": self.photo_required,
            "biweekly_anchor": self.biweekly_anchor,
            "is_active": self.is_active,
            "created_by_id": self.created_by_id,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
