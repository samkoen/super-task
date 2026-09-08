"""Tests helpers controllers."""
from __future__ import annotations

import asyncio
import json

from fastapi import HTTPException

from app.controllers.controller_helpers import handle_controller_errors


def test_handle_controller_errors_sync_returns_value():
    @handle_controller_errors
    def ok():
        return {"value": 1}

    assert ok() == {"value": 1}


def test_handle_controller_errors_async_returns_value():
    @handle_controller_errors
    async def ok():
        return {"value": 2}

    assert asyncio.iscoroutinefunction(ok)
    assert asyncio.run(ok()) == {"value": 2}


def test_handle_controller_errors_async_maps_permission_error():
    @handle_controller_errors
    async def denied():
        raise PermissionError("forbidden")

    response = asyncio.run(denied())
    assert response.status_code == 403
    assert response.body == b'{"error":"forbidden"}'


def test_handle_controller_errors_sync_maps_http_exception():
    @handle_controller_errors
    def not_found():
        raise HTTPException(status_code=404, detail="missing")

    response = not_found()
    assert response.status_code == 404
    assert response.body == b'{"error":"missing"}'


def test_handle_controller_errors_stringifies_http_exception_object():
    @handle_controller_errors
    def bad_request():
        raise HTTPException(status_code=400, detail={"message": "יש להתחיל את המשימה לפני הסיום"})

    response = bad_request()
    assert response.status_code == 400
    assert json.loads(response.body) == {"error": "יש להתחיל את המשימה לפני הסיום"}
