from dataclasses import asdict, dataclass, field


@dataclass
class WhatsAppMessage:
    id: str
    sent_by_user_id: str | None
    recipient_user_id: str | None
    recipient_name: str
    recipient_phone: str
    template_key: str
    variables: dict = field(default_factory=dict)
    brevo_message_id: str | None = None
    status: str = "sent"
    error: str | None = None
    consent_confirmed: bool = False
    consent_confirmed_at: str | None = None
    created_at: str | None = None

    def to_dict(self) -> dict:
        return asdict(self)
