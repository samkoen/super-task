from dataclasses import dataclass


@dataclass
class UserNotification:
    id: str
    user_id: str
    kind: str
    title: str
    message: str
    occurrence_id: str | None
    issue_report_id: str | None
    branch_id: str | None
    read_at: str | None
    created_at: str

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "kind": self.kind,
            "title": self.title,
            "message": self.message,
            "occurrence_id": self.occurrence_id,
            "issue_report_id": self.issue_report_id,
            "branch_id": self.branch_id,
            "read_at": self.read_at,
            "created_at": self.created_at,
            "is_read": self.read_at is not None,
        }
