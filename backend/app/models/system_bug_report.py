import json
from dataclasses import dataclass


@dataclass
class SystemBugReport:
    id: str
    reporter_user_id: str | None
    reporter_name: str
    reporter_role: str
    branch_name: str
    network_name: str
    note: str
    route: str
    trail: list[str]
    app_version: str
    screenshot_url: str | None
    audio_url: str | None
    github_issue_url: str | None
    status: str
    created_at: str

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "reporter_user_id": self.reporter_user_id,
            "reporter_name": self.reporter_name,
            "reporter_role": self.reporter_role,
            "branch_name": self.branch_name,
            "network_name": self.network_name,
            "note": self.note,
            "route": self.route,
            "trail": self.trail,
            "app_version": self.app_version,
            "screenshot_url": self.screenshot_url,
            "audio_url": self.audio_url,
            "github_issue_url": self.github_issue_url,
            "status": self.status,
            "created_at": self.created_at,
        }


def trail_to_json(trail: list[str]) -> str:
    return json.dumps(trail, ensure_ascii=False)


def trail_from_json(raw: str | None) -> list[str]:
    if not raw:
        return []
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return []
    if not isinstance(data, list):
        return []
    return [str(item) for item in data if str(item).strip()]
