from dataclasses import dataclass


@dataclass
class IssueReport:
    id: str
    reporter_user_id: str
    branch_id: str
    text: str | None
    photo_url: str | None
    video_url: str | None
    audio_url: str | None
    created_at: str
    reporter_name: str | None = None
    branch_name: str | None = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "reporter_user_id": self.reporter_user_id,
            "reporter_name": self.reporter_name,
            "branch_id": self.branch_id,
            "branch_name": self.branch_name,
            "text": self.text,
            "photo_url": self.photo_url,
            "video_url": self.video_url,
            "audio_url": self.audio_url,
            "created_at": self.created_at,
        }
