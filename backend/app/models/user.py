from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Optional


@dataclass
class User:
    id: str
    email: str
    first_name: str
    last_name: str
    role: str = "employee"
    phone: Optional[str] = None
    job_function: Optional[str] = None
    network_id: Optional[str] = None
    branch_id: Optional[str] = None
    is_active: bool = True
    email_verified: bool = False
    preferred_language: str = "he"
    created_at: str | None = None
    updated_at: str | None = None

    def __post_init__(self) -> None:
        if self.created_at is None:
            self.created_at = datetime.now().isoformat()
        if self.updated_at is None:
            self.updated_at = datetime.now().isoformat()

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    def to_dict(self) -> dict:
        data = asdict(self)
        data["full_name"] = self.full_name
        return data

    @classmethod
    def from_dict(cls, data: dict) -> "User":
        allowed = {
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "phone",
            "job_function",
            "network_id",
            "branch_id",
            "is_active",
            "email_verified",
            "preferred_language",
            "created_at",
            "updated_at",
        }
        clean = {k: v for k, v in data.items() if k in allowed}
        return cls(**clean)
