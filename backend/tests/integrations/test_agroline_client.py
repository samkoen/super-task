from datetime import date

import httpx

from app.integrations.agroline.client import AgrolineClient, AgrolineError, fetch_documents
from app.integrations.agroline.secret import decrypt_password, encrypt_password


def test_password_roundtrip():
    stored = encrypt_password("s3cret")
    assert stored != "s3cret"
    assert decrypt_password(stored) == "s3cret"


def test_fetch_documents_reads_list_lines_and_pdf():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/auth"):
            assert request.read()
            return httpx.Response(200, json={"token": "tok"})
        if request.url.path.endswith("/delivery"):
            return httpx.Response(
                200,
                json=[
                    {
                        "Delivery_Num": 2315109,
                        "Delivery_Sub": 0,
                        "Customer_Name": "שפע כנסת יחזקאל",
                        "GroupDesc": "טריים",
                        "Delivery_Date": "20261002",
                    }
                ],
            )
        if request.url.path.endswith("/pallet/details"):
            return httpx.Response(
                200,
                json=[{"ProductDesc": "עגבניות", "Quantity": 12, "Pack_Name": "ק״ג"}],
            )
        if request.url.path.endswith("/pdf"):
            return httpx.Response(200, content=b"%PDF")
        return httpx.Response(404)

    client = AgrolineClient(base_url="https://agroline.test/v2", transport=httpx.MockTransport(handler))
    documents, errors = fetch_documents(
        client,
        username="user",
        password="secret",
        internal=False,
        day=date(2026, 10, 2),
        store_pdf=lambda data: "https://files/note.pdf" if data.startswith(b"%PDF") else None,
    )
    client.close()
    assert errors == []
    assert documents[0]["agroline_number"] == "2315109"
    assert documents[0]["document_date"] == "2026-10-02"
    assert documents[0]["pdf_url"] == "https://files/note.pdf"
    assert documents[0]["lines"][0]["product_name"] == "עגבניות"


def test_login_reports_when_agroline_is_unreachable():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("offline")

    client = AgrolineClient(base_url="https://agroline.test/v2", transport=httpx.MockTransport(handler))
    try:
        client.login("user", "secret", False)
        raise AssertionError("expected error")
    except AgrolineError as exc:
        assert "לא ניתן להתחבר" in str(exc)
    finally:
        client.close()


def test_login_rejects_bad_password():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"error": "no"})

    client = AgrolineClient(base_url="https://agroline.test/v2", transport=httpx.MockTransport(handler))
    try:
        client.login("user", "bad", False)
        raise AssertionError("expected error")
    except Exception as exc:
        assert "סיסמה" in str(exc)
    finally:
        client.close()
