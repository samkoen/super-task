import io
import json
from urllib.error import HTTPError

import pytest

from app.integrations.brevo import BrevoApiError, whatsapp_client


class _Resp:
    status = 201

    def __init__(self, body: str):
        self._body = body

    def read(self):
        return self._body.encode()

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def test_payload_shape():
    payload = whatsapp_client.build_whatsapp_payload(
        to_number="972501234567", sender_number="972500000000", template_id=5, params={"NAME": "x"}
    )
    assert payload == {
        "contactNumbers": ["972501234567"],
        "senderNumber": "972500000000",
        "templateId": 5,
        "params": {"NAME": "x"},
    }


def test_send_posts_to_whatsapp_endpoint(monkeypatch):
    seen = {}

    def fake_urlopen(req, timeout):
        seen["url"] = req.full_url
        seen["key"] = req.get_header("Api-key")
        seen["body"] = json.loads(req.data.decode())
        return _Resp('{"messageId": "abc"}')

    monkeypatch.setattr(whatsapp_client, "brevo_api_key", lambda: "k")
    monkeypatch.setattr(whatsapp_client, "urlopen", fake_urlopen)
    out = whatsapp_client.send_whatsapp_template(
        to_number="972501234567", sender_number="972500000000", template_id=5, params={"NAME": "x"}
    )
    assert out == {"messageId": "abc"}
    assert seen["url"] == "https://api.brevo.com/v3/whatsapp/sendMessage"
    assert seen["key"] == "k"
    assert seen["body"]["templateId"] == 5


def test_missing_api_key_raises(monkeypatch):
    monkeypatch.setattr(whatsapp_client, "brevo_api_key", lambda: None)
    with pytest.raises(BrevoApiError):
        whatsapp_client.send_whatsapp_template(
            to_number="1", sender_number="2", template_id=1, params={}
        )


def test_http_error_message_extracted(monkeypatch):
    def fake_urlopen(req, timeout):
        raise HTTPError(req.full_url, 400, "bad", {}, io.BytesIO(b'{"message": "bad template"}'))

    monkeypatch.setattr(whatsapp_client, "brevo_api_key", lambda: "k")
    monkeypatch.setattr(whatsapp_client, "urlopen", fake_urlopen)
    with pytest.raises(BrevoApiError, match="bad template"):
        whatsapp_client.send_whatsapp_template(
            to_number="1", sender_number="2", template_id=1, params={}
        )
