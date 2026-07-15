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
    audio_transcript: str | None = None
    audio_transcript_employee: str | None = None
    manager_review_status: str | None = None
    manager_reviewed_by_id: str | None = None
    manager_reviewed_at: str | None = None
    rejection_note: str | None = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "occurrence_id": self.occurrence_id,
            "status": self.status,
            "note": self.note,
            "photo_path": self.photo_path,
            "video_path": self.video_path,
            "audio_path": self.audio_path,
            "audio_transcript": self.audio_transcript,
            "audio_transcript_employee": self.audio_transcript_employee,
            "not_completed_reason": self.not_completed_reason,
            "completed_by_id": self.completed_by_id,
            "completed_at": self.completed_at,
            "manager_review_status": self.manager_review_status,
            "manager_reviewed_by_id": self.manager_reviewed_by_id,
            "manager_reviewed_at": self.manager_reviewed_at,
            "rejection_note": self.rejection_note,
        }
