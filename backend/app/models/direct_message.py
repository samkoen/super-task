from dataclasses import dataclass


@dataclass
class DirectMessage:
    id: str
    conversation_id: str
    sender_user_id: str
    body: str | None
    photo_url: str | None
    video_url: str | None
    audio_url: str | None
    created_at: str

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "sender_user_id": self.sender_user_id,
            "body": self.body,
            "photo_url": self.photo_url,
            "video_url": self.video_url,
            "audio_url": self.audio_url,
            "created_at": self.created_at,
        }
