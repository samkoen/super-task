from dataclasses import dataclass


@dataclass
class TaskCompletion:
    id: str
    occurrence_id: str
    status: str
    note: str | None
    photo_path: str | None
    video_path: str | None
    audio_path: str | None
    not_completed_reason: str | None
    completed_by_id: str
    completed_at: str

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "occurrence_id": self.occurrence_id,
            "status": self.status,
            "note": self.note,
            "photo_path": self.photo_path,
            "video_path": self.video_path,
            "audio_path": self.audio_path,
            "not_completed_reason": self.not_completed_reason,
            "completed_by_id": self.completed_by_id,
            "completed_at": self.completed_at,
        }
