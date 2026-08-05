from dataclasses import asdict, dataclass
from datetime import datetime


@dataclass
class PromotionStage:
    """במת מבצע — מחלקה ◄ במה ◄ עובד אחראי."""

    id: str
    branch_id: str
    department_id: str
    name: str
    location_label: str = ""
    assignee_user_id: str | None = None
    lead_product_name: str = ""
    stock_pct: float = 100.0
    signage_status: str = "ok"
    is_active: bool = True
    created_at: str | None = None
    updated_at: str | None = None

    def __post_init__(self) -> None:
        now = datetime.now().isoformat()
        if self.created_at is None:
            self.created_at = now
        if self.updated_at is None:
            self.updated_at = now

    def to_dict(self) -> dict:
        return asdict(self)
