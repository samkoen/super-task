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
    monthly_day: int | None
    assignee_user_id: str | None
    department_id: str | None
    task_kind: str
    photo_required: bool
    reference_photo_url: str | None
    reference_video_url: str | None
    reference_audio_url: str | None
    biweekly_anchor: str | None
    is_active: bool
    created_by_id: str
    created_at: str
    updated_at: str
    source_gallery_item_id: str | None = None
    ops_category: str | None = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "branch_id": self.branch_id,
            "title": self.title,
            "description": self.description,
            "recurrence": self.recurrence,
            "due_time": self.due_time,
            "weekly_days": self.weekly_days,
            "monthly_day": self.monthly_day,
            "assignee_user_id": self.assignee_user_id,
            "department_id": self.department_id,
            "task_kind": self.task_kind,
            "ops_category": self.ops_category,
            "photo_required": self.photo_required,
            "reference_photo_url": self.reference_photo_url,
            "reference_video_url": self.reference_video_url,
            "reference_audio_url": self.reference_audio_url,
            "biweekly_anchor": self.biweekly_anchor,
            "source_gallery_item_id": self.source_gallery_item_id,
            "is_active": self.is_active,
            "created_by_id": self.created_by_id,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
