from dataclasses import asdict, dataclass


@dataclass
class AppRelease:
    id: str
    version_code: int
    version_name: str
    apk_url: str
    published_by_user_id: str | None = None
    created_at: str | None = None

    def to_dict(self) -> dict:
        return asdict(self)
