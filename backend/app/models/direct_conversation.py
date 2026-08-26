from dataclasses import dataclass


@dataclass
class DirectConversation:
    id: str
    scope: str
    scope_id: str
    counterpart_user_id: str
    last_preview: str | None
    last_at: str | None
    last_sender_user_id: str | None
    created_at: str

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "scope": self.scope,
            "scope_id": self.scope_id,
            "counterpart_user_id": self.counterpart_user_id,
            "last_preview": self.last_preview,
            "last_at": self.last_at,
            "last_sender_user_id": self.last_sender_user_id,
            "created_at": self.created_at,
        }
