from typing import Any

from fastapi import APIRouter, Body, Depends, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.auth.actor import load_actor
from app.controllers.controller_helpers import handle_controller_errors
from app.dependencies import get_db
from app.repositories.branch_repository import BranchRepository
from app.repositories.department_repository import DepartmentRepository
from app.repositories.product_repository import ProductRepository
from app.repositories.user_repository import UserRepository
from app.services.product_service import ProductService

router = APIRouter()


def get_service(db: Session = Depends(get_db)) -> ProductService:
    return ProductService(ProductRepository(db), DepartmentRepository(db), BranchRepository(db))


@router.get("")
@handle_controller_errors
def list_products(
    request: Request,
    department_id: str | None = Query(None),
    name: str | None = Query(None),
    service: ProductService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    return service.list_products(actor, department_id=department_id, name=name)


@router.post("", status_code=201)
@handle_controller_errors
def create_product(
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: ProductService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    if not data:
        return JSONResponse({"error": "חסרים נתונים"}, status_code=400)
    item = service.create_product(
        actor,
        department_id=str(data.get("department_id") or ""),
        name=str(data.get("name") or ""),
        sku=str(data.get("sku") or ""),
    )
    return {"message": "המוצר נוצר", "product": item}


@router.patch("/{product_id}")
@handle_controller_errors
def update_product(
    product_id: str,
    request: Request,
    data: dict[str, Any] | None = Body(default=None),
    service: ProductService = Depends(get_service),
    db: Session = Depends(get_db),
):
    actor = load_actor(request, UserRepository(db))
    payload = data or {}
    item = service.update_product(
        actor,
        product_id,
        name=str(payload.get("name") or ""),
        sku=str(payload.get("sku") or ""),
        is_active=bool(payload.get("is_active", True)),
    )
    return {"message": "המוצר עודכן", "product": item}
