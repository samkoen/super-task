"""Oved sans קליטה : la tâche est finie sur le téléphone, les fichiers partiront plus tard (règles pures)."""
from __future__ import annotations

from datetime import datetime, timedelta

from app.domain import task_status

MAX_OFFLINE_AGE = timedelta(days=3)
LAST_SEEN_MIN_GAP = timedelta(minutes=2)

_STARTABLE = {task_status.PENDING, task_status.OVERDUE}
_OPEN = {task_status.IN_PROGRESS, task_status.AWAITING_RESPONSE, *_STARTABLE}


def finished_at_from_client(raw: object, now: datetime) -> datetime:
    """Heure de fin vue par le téléphone, bornée : jamais dans le futur ni plus vieille que 3 jours."""
    try:
        when = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return now
    if when.tzinfo is None:
        when = when.replace(tzinfo=now.tzinfo)
    if when > now:
        return now
    return max(when, now - MAX_OFFLINE_AGE)


def accepts_finish_signal(status: str) -> bool:
    """Seule une tâche encore ouverte peut attendre ses fichiers ; envoyée ou fermée, le signal est ignoré."""
    return status in _OPEN


def needs_start(status: str) -> bool:
    return status in _STARTABLE


def keeps_awaiting_upload(status: str) -> bool:
    """Dès que la preuve est arrivée (à contrôler, fermée, annulée), l'attente des fichiers est terminée."""
    return status not in {task_status.PENDING_REVIEW, *task_status.TERMINAL}
