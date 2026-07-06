from dataclasses import asdict, dataclass
from datetime import datetime


@dataclass
class Product:
    id: str
    department_id: str
    name: str
    sku: str = ""
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
