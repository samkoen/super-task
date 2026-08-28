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
    media_purge_after: str | None
    started_at: str | None
    started_by_id: str | None
    created_by_id: str | None
    created_at: str
    updated_at: str
    source_gallery_item_id: str | None = None
    ops_category: str | None = None
    manager_next_at: str | None = None
    # Date d'ouverture (YYYY-MM-DD), immuable. due_at = exécution.
    opened_on: str | None = None
    min_video_seconds: int | None = None
    completion_requirements: list | None = None
    is_work_start: bool = False
    is_work_end: bool = False
    start_url: str | None = None
    network_group_id: str | None = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "template_id": self.template_id,
            "branch_id": self.branch_id,
            "title": self.title,
            "description": self.description,
            "due_at": self.due_at,
            "opened_on": self.opened_on,
            "status": self.status,
            "assignee_user_id": self.assignee_user_id,
            "department_id": self.department_id,
            "task_kind": self.task_kind,
            "ops_category": self.ops_category,
            "manager_user_id": self.manager_user_id,
            "min_video_seconds": self.min_video_seconds,
            "completion_requirements": self.completion_requirements or [],
            "is_work_start": self.is_work_start,
            "is_work_end": self.is_work_end,
            "start_url": self.start_url,
            "network_group_id": self.network_group_id,
            "photo_required": self.photo_required,
            "reference_photo_url": self.reference_photo_url,
            "reference_video_url": self.reference_video_url,
            "reference_audio_url": self.reference_audio_url,
            "media_purge_after": self.media_purge_after,
            "source_gallery_item_id": self.source_gallery_item_id,
            "started_at": self.started_at,
            "started_by_id": self.started_by_id,
            "manager_next_at": self.manager_next_at,
            "created_by_id": self.created_by_id,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "is_manager_next": bool(self.manager_next_at),
        }

    @property
    def pending_delegation(self) -> bool:
        return self.manager_user_id is not None and self.assignee_user_id is None
