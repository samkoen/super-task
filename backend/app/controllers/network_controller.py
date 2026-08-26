from typing import Any

from fastapi import APIRouter, Body, Depends, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.auth.actor import load_actor
from app.controllers.controller_helpers import handle_controller_errors
from app.dependencies import get_db
from app.repositories.network_repository import NetworkRepository
from app.repositories.user_repository import UserRepository
from app.services.network_service import NetworkService

router = APIRouter()


def get_service(db: Session = Depends(get_db)) -> NetworkService:
    return NetworkService(NetworkRepository(db))


@router.get("")
@handle_controller_errors
def list_networks(
    request: Request,
    name: str | None = Query(None),
    service: NetworkService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    return service.list_networks(actor, name=name)


@router.post("", status_code=201)
@handle_controller_errors
def create_network(
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: NetworkService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    if not data:
        return JSONResponse({"error": "חסרים נתונים"}, status_code=400)
    item = service.create_network(
        actor,
        name=str(data.get("name") or ""),
        manages_all_workers=bool(data.get("manages_all_workers")),
    )
    return {"message": "הרשת נוצרה", "network": item}


@router.patch("/{network_id}")
@handle_controller_errors
def update_network(
    network_id: str,
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: NetworkService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    payload = data or {}
    item = service.update_network(
        actor,
        network_id,
        name=None if "name" not in payload else str(payload.get("name") or ""),
        is_active=None if "is_active" not in payload else bool(payload.get("is_active")),
        manages_all_workers=(
            None if "manages_all_workers" not in payload else bool(payload.get("manages_all_workers"))
        ),
    )
    return {"message": "הרשת עודכנה", "network": item}
