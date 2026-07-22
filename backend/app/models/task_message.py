from dataclasses import dataclass


@dataclass
class TaskMessage:
    id: str
    occurrence_id: str
    sender_user_id: str
    body: str | None
    photo_url: str | None
    video_url: str | None
    audio_url: str | None
    created_at: str
    body_translated: str | None = None
    audio_transcript: str | None = None
    audio_transcript_sender: str | None = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "occurrence_id": self.occurrence_id,
            "sender_user_id": self.sender_user_id,
            "body": self.body,
            "body_translated": self.body_translated,
            "photo_url": self.photo_url,
            "video_url": self.video_url,
            "audio_url": self.audio_url,
            "audio_transcript": self.audio_transcript,
            "audio_transcript_sender": self.audio_transcript_sender,
            "created_at": self.created_at,
        }
