from dataclasses import dataclass


@dataclass
class TaskOccurrence:
    id: str
    template_id: str | None
    branch_id: str
    title: str
    description: str
    due_at: str
    status: str
    assignee_user_id: str | None
    department_id: str | None
    task_kind: str
    manager_user_id: str | None
    photo_required: bool
    reference_photo_url: str | None
    reference_video_url: str | None
    reference_audio_url: str | None
    started_at: str | None
    started_by_id: str | None
    created_by_id: str | None
    created_at: str
    updated_at: str

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "template_id": self.template_id,
            "branch_id": self.branch_id,
            "title": self.title,
            "description": self.description,
            "due_at": self.due_at,
            "status": self.status,
            "assignee_user_id": self.assignee_user_id,
            "department_id": self.department_id,
            "task_kind": self.task_kind,
            "manager_user_id": self.manager_user_id,
            "photo_required": self.photo_required,
            "reference_photo_url": self.reference_photo_url,
            "reference_video_url": self.reference_video_url,
            "reference_audio_url": self.reference_audio_url,
            "started_at": self.started_at,
            "started_by_id": self.started_by_id,
            "created_by_id": self.created_by_id,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @property
    def pending_delegation(self) -> bool:
        return self.manager_user_id is not None and self.assignee_user_id is None
