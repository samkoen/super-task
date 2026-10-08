import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

import app.db.models as orm
from app.db import mappers as mp
from app.models.whatsapp_message import WhatsAppMessage


class WhatsAppMessageRepository:
    def __init__(self, db: Session):
        self._db = db

    def create(
        self,
        *,
        sent_by_user_id: str,
        recipient_user_id: str | None,
        recipient_name: str,
        recipient_phone: str,
        template_key: str,
        variables: dict,
        brevo_message_id: str | None,
        status: str,
        error: str | None,
        consent_confirmed: bool,
    ) -> WhatsAppMessage:
        row = orm.WhatsAppMessage(
            id=uuid.uuid4(),
            sent_by_user_id=mp.parse_uuid(sent_by_user_id),
            recipient_user_id=mp.parse_uuid(recipient_user_id) if recipient_user_id else None,
            recipient_name=recipient_name,
            recipient_phone=recipient_phone,
            template_key=template_key,
            variables=variables,
            brevo_message_id=brevo_message_id,
            status=status,
            error=error,
            consent_confirmed=consent_confirmed,
            consent_confirmed_at=datetime.now(timezone.utc) if consent_confirmed else None,
        )
        self._db.add(row)
        self._db.flush()
        self._db.refresh(row)
        out = mp.whatsapp_message_orm_to_domain(row)
        assert out is not None
        return out
