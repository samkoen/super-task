from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Optional


@dataclass
class UserInvitation:
    id: str
    email: str
    role: str
    invited_by_id: str
    status: str
    expires_at: str
    job_function: Optional[str] = None
    network_id: Optional[str] = None
    branch_id: Optional[str] = None
    accepted_at: Optional[str] = None
    created_at: str | None = None

    def __post_init__(self) -> None:
        if self.created_at is None:
            self.created_at = datetime.now().isoformat()

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "UserInvitation":
        allowed = {
            "id",
            "email",
            "role",
            "job_function",
            "network_id",
            "branch_id",
            "invited_by_id",
            "status",
            "expires_at",
            "accepted_at",
            "created_at",
        }
        clean = {k: v for k, v in data.items() if k in allowed}
        return cls(**clean)
