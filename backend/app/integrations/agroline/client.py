"""Lecture des תעודות משלוח sur my.agroline.co.il."""
from __future__ import annotations

from datetime import date

import httpx

from app.core.config import AGROLINE_BASE_URL
from app.domain.agroline_delivery import map_agroline_delivery
from app.domain.delivery_pdf import attach_pdf_origins


class AgrolineError(Exception):
    """Agroline a refusé la connexion ou une lecture."""


class AgrolineClient:
    def __init__(self, base_url: str | None = None, transport: httpx.BaseTransport | None = None):
        self._http = httpx.Client(
            base_url=(base_url or AGROLINE_BASE_URL).rstrip("/"),
            timeout=httpx.Timeout(connect=15.0, read=45.0, write=30.0, pool=15.0),
            transport=transport,
        )

    def close(self) -> None:
        self._http.close()

    def login(self, username: str, password: str, internal: bool) -> str:
        try:
            response = self._http.post(
                "/auth",
                json={"Login": username, "Password": password, "Internal": bool(internal)},
            )
        except httpx.HTTPError as exc:
            raise AgrolineError("לא ניתן להתחבר לאגרוליין") from exc
        body = _json_or_empty(response)
        if response.status_code in {401, 403}:
            raise AgrolineError("שם משתמש או סיסמה שגויים")
        _raise_for_status(response, body)
        if body.get("requires2fa"):
            raise AgrolineError("החשבון דורש אימות דו-שלבי. השתמשו במשתמש בלי קוד SMS.")
        token = body.get("token")
        if not token:
            raise AgrolineError("אגרוליין לא החזיר אסימון התחברות")
        return str(token)

    def list_deliveries(self, token: str, day: date) -> list[dict]:
        stamp = day.strftime("%Y%m%d")
        try:
            response = self._http.get(
                "/delivery",
                params={"DateFrom": stamp, "DateTo": stamp},
                headers=_headers(token),
            )
        except httpx.HTTPError as exc:
            raise AgrolineError("לא ניתן להתחבר לאגרוליין") from exc
        body = _json_or_empty(response)
        _raise_for_status(response, body)
        return _as_list(body, ("deliveries", "data"))

    def lines(self, token: str, number: object, sub: object) -> list[dict]:
        response = self._http.get(
            "/pallet/details",
            params={"Delivery_Num": number, "Delivery_Sub": sub or 0},
            headers=_headers(token),
        )
        body = _json_or_empty(response)
        _raise_for_status(response, body)
        return _as_list(body, ("details", "data", "pallets"))

    def pdf(self, token: str, number: object, sub: object) -> bytes:
        response = self._http.get(
            f"/delivery/{number}/{sub or 0}/pdf",
            headers=_headers(token),
        )
        if response.status_code >= 400:
            raise AgrolineError("לא ניתן להוריד את ה-PDF")
        return response.content


def fetch_documents(
    client: AgrolineClient,
    *,
    username: str,
    password: str,
    internal: bool,
    day: date,
    store_pdf,
) -> tuple[list[dict], list[dict]]:
    token = client.login(username, password, internal)
    documents: list[dict] = []
    errors: list[dict] = []
    for header in client.list_deliveries(token, day):
        document, error = _one_document(client, token, header, day, store_pdf)
        if document:
            documents.append(document)
        if error:
            errors.append(error)
    return documents, errors


def _one_document(client, token, header, day, store_pdf) -> tuple[dict | None, dict | None]:
    number = header.get("Delivery_Num")
    sub = header.get("Delivery_Sub") or 0
    try:
        detail = client.lines(token, number, sub)
        pdf = _pdf_bytes(client, token, number, sub)
        document = map_agroline_delivery(header, detail, pdf_url=None, fallback_date=day.isoformat())
        if pdf:
            attach_pdf_origins(document["lines"], pdf)
            document["pdf_url"] = _store_pdf(pdf, store_pdf)
        return document, None
    except (AgrolineError, ValueError, httpx.HTTPError) as exc:
        message = str(exc) if isinstance(exc, (AgrolineError, ValueError)) else "לא ניתן לקרוא את התעודה מאגרוליין"
        return None, {"agroline_number": str(number or ""), "error": message}


def _pdf_bytes(client, token, number, sub) -> bytes | None:
    try:
        return client.pdf(token, number, sub)
    except (AgrolineError, httpx.HTTPError):
        return None


def _store_pdf(pdf: bytes, store_pdf) -> str | None:
    try:
        return store_pdf(pdf)
    except (AgrolineError, httpx.HTTPError):
        return None


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _json_or_empty(response: httpx.Response) -> dict:
    try:
        body = response.json()
    except ValueError:
        return {}
    return body if isinstance(body, dict) else {"data": body}


def _as_list(body: dict | list, keys: tuple[str, ...]) -> list[dict]:
    if isinstance(body, list):
        return [row for row in body if isinstance(row, dict)]
    raw = body.get("data")
    if isinstance(raw, list):
        return [row for row in raw if isinstance(row, dict)]
    for key in keys:
        rows = body.get(key)
        if isinstance(rows, list):
            return [row for row in rows if isinstance(row, dict)]
    return []


def _raise_for_status(response: httpx.Response, body: dict) -> None:
    if response.status_code < 400:
        return
    message = body.get("error") or body.get("message") or "אגרוליין סירב לבקשה"
    raise AgrolineError(str(message))
