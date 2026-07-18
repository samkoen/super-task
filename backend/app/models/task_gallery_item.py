from dataclasses import dataclass


@dataclass
class TaskGalleryItem:
    id: str
    network_id: str
    branch_id: str | None
    title: str
    description: str
    task_kind: str
    recurrence: str | None
    due_time: str | None
    weekly_days: str | None
    monthly_day: int | None
    photo_required: bool
    reference_photo_url: str | None
    reference_video_url: str | None
    reference_audio_url: str | None
    created_by_id: str
    created_at: str
    updated_at: str
    source_occurrence_id: str | None = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "network_id": self.network_id,
            "branch_id": self.branch_id,
            "title": self.title,
            "description": self.description,
            "task_kind": self.task_kind,
            "recurrence": self.recurrence,
            "due_time": self.due_time,
            "weekly_days": self.weekly_days,
            "monthly_day": self.monthly_day,
            "photo_required": self.photo_required,
            "reference_photo_url": self.reference_photo_url,
            "reference_video_url": self.reference_video_url,
            "reference_audio_url": self.reference_audio_url,
            "source_occurrence_id": self.source_occurrence_id,
            "created_by_id": self.created_by_id,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
