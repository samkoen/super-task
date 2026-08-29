from dataclasses import dataclass


@dataclass
class EmployeeBreakInterval:
    id: str
    user_id: str
    started_at: str
    ended_at: str | None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "started_at": self.started_at,
            "ended_at": self.ended_at,
        }
