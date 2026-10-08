"""תעודות משלוח : compte Agroline, lecture du jour, ouverture des tâches."""
from datetime import date, datetime
from typing import Any
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Body, Depends, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.auth.actor import load_actor
from app.controllers.controller_helpers import handle_controller_errors
from app.dependencies import get_db
from app.integrations.agroline.client import AgrolineClient, AgrolineError, fetch_documents
from app.repositories.agroline_account_repository import AgrolineAccountRepository
from app.repositories.delivery_note_repository import DeliveryNoteRepository
from app.repositories.task_occurrence_repository import TaskOccurrenceRepository
from app.repositories.task_template_repository import TaskTemplateRepository
from app.repositories.user_repository import UserRepository
from app.services import blob_storage
from app.services.delivery_note_service import DeliveryNoteService

router = APIRouter()


def get_service(db: Session = Depends(get_db)) -> DeliveryNoteService:
    return DeliveryNoteService(
        DeliveryNoteRepository(db),
        TaskTemplateRepository(db),
        TaskOccurrenceRepository(db),
        AgrolineAccountRepository(db),
    )


@router.post("/links")
@handle_controller_errors
def link_customer(
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: DeliveryNoteService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    payload = data or {}
    return service.link_customer(
        actor,
        str(payload.get("customer_name") or ""),
        str(payload.get("branch_id") or ""),
    )


@router.post("/templates/{template_id}")
@handle_controller_errors
def mark_template(
    template_id: str,
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: DeliveryNoteService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    payload = data or {}
    opened = bool(payload.get("opened", True))
    return service.mark_opened_by_delivery_note(actor, template_id, opened, payload.get("task_type"))


@router.post("/ingest")
@handle_controller_errors
def ingest_note(
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: DeliveryNoteService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    if not data:
        return JSONResponse({"error": "חסרים נתונים"}, status_code=400)
    return service.ingest(actor, data)


@router.get("/account")
@handle_controller_errors
def account_status(
    request: Request,
    service: DeliveryNoteService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    return service.account_status(actor)


@router.post("/account")
@handle_controller_errors
def save_account(
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: DeliveryNoteService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    payload = data or {}
    return service.save_account(
        actor,
        str(payload.get("username") or ""),
        str(payload.get("password") or ""),
        bool(payload.get("internal")),
        bool(payload.get("enabled")),
    )


@router.post("/sync")
@handle_controller_errors
def sync_notes(
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: DeliveryNoteService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    payload = data or {}
    documents = payload.get("documents")
    if documents:
        return {"results": service.ingest_many(actor, documents), "errors": []}
    day = _sync_day(payload.get("date"))
    fetched, read_errors = _read_agroline(service, day)
    opened = service.pull_documents(actor, fetched)
    opened["errors"] = read_errors + opened["errors"]
    return opened


@router.get("/inbox")
@handle_controller_errors
def list_inbox(
    request: Request,
    service: DeliveryNoteService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    return service.list_inbox(actor, _sync_day(None).isoformat())


@router.get("")
@handle_controller_errors
def list_notes(
    request: Request,
    document_date: str = Query(...),
    branch_id: str | None = Query(None),
    service: DeliveryNoteService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    return service.list_mishloah(actor, document_date=document_date, branch_id=branch_id)


@router.get("/occurrences/{occurrence_id}")
@handle_controller_errors
def check_for_occurrence(
    occurrence_id: str,
    request: Request,
    service: DeliveryNoteService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    check = service.check_for_occurrence(actor, occurrence_id)
    if check is None:
        return JSONResponse({"error": "אין תעודה למשימה זו"}, status_code=404)
    return check


@router.post("/occurrences/{occurrence_id}/answers")
@handle_controller_errors
def submit_answers(
    occurrence_id: str,
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: DeliveryNoteService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    return service.submit_answers(actor, occurrence_id, data or {})


def _sync_day(value: object) -> date:
    text = str(value or "").strip()
    if not text:
        return datetime.now(ZoneInfo("Asia/Jerusalem")).date()
    try:
        return date.fromisoformat(text)
    except ValueError as exc:
        raise ValueError("תאריך לא תקין") from exc


def _read_agroline(service: DeliveryNoteService, day: date) -> tuple[list[dict], list[dict]]:
    username, password, internal = service.credentials()
    client = AgrolineClient()
    try:
        try:
            return fetch_documents(
                client,
                username=username,
                password=password,
                internal=internal,
                day=day,
                store_pdf=lambda data: blob_storage.put_bytes(
                    folder="delivery_notes", data=data, ext=".pdf", content_type="application/pdf"
                ),
            )
        except AgrolineError as exc:
            raise ValueError(str(exc)) from exc
    finally:
        client.close()
