from app.domain.object_media_url import MediaPayload
from app.services import object_store


class _FakeBody:
    def __init__(self, data: bytes):
        self._data = data

    def read(self, n: int | None = None) -> bytes:
        if n is None:
            return self._data
        return self._data[:n]


class FakeS3:
    def __init__(self):
        self.objects: dict[str, tuple[bytes, str]] = {}
        self.presigned: list[tuple[str, dict]] = []

    def put_object(self, *, Bucket: str, Key: str, Body: bytes, ContentType: str):
        self.objects[Key] = (Body, ContentType)

    def copy_object(self, *, Bucket: str, Key: str, CopySource: dict):
        src = CopySource["Key"]
        self.objects[Key] = self.objects[src]

    def delete_object(self, *, Bucket: str, Key: str):
        self.objects.pop(Key, None)

    def get_object(self, *, Bucket: str, Key: str, Range: str | None = None):
        data, content_type = self.objects[Key]
        if Range:
            data = data[:8]
        return {"Body": _FakeBody(data), "ContentType": content_type}

    def head_object(self, *, Bucket: str, Key: str):
        if Key not in self.objects:
            raise KeyError(Key)
        return {"ContentType": self.objects[Key][1]}

    def generate_presigned_url(self, method: str, Params: dict, ExpiresIn: int):
        self.presigned.append((method, Params))
        return f"https://signed.example/{method}/{Params['Key']}"


def _enable_r2(monkeypatch, fake: FakeS3):
    monkeypatch.setattr(object_store.config, "R2_ACCESS_KEY_ID", "test")
    monkeypatch.setattr(object_store.config, "R2_SECRET_ACCESS_KEY", "test")
    monkeypatch.setattr(object_store.config, "R2_BUCKET", "super-media")
    monkeypatch.setattr(
        object_store.config,
        "R2_ENDPOINT",
        "https://abc.r2.cloudflarestorage.com",
    )
    monkeypatch.setattr(object_store, "s3_client", lambda: fake)


def test_put_copy_delete_and_presign(monkeypatch):
    fake = FakeS3()
    _enable_r2(monkeypatch, fake)
    url = object_store.put_bytes("task_videos/a.webm", b"vid", "video/webm")
    assert url.endswith("/super-media/task_videos/a.webm")
    payload = object_store.get_payload(url)
    assert payload == MediaPayload(b"vid", "video/webm", ".webm")
    copied = object_store.copy_key(url, "task_videos/b.webm")
    assert copied.endswith("/super-media/task_videos/b.webm")
    assert object_store.object_is_readable(url) is True
    put = object_store.presign_put("task_videos/c.webm", "video/webm")
    assert "put_object" in put
    get = object_store.presign_get(url)
    assert "get_object" in get
    object_store.delete_key_url(url)
    assert object_store.get_payload(url) is None
    assert object_store.object_is_readable(url) is False
    assert object_store.presign_get("https://evil.example/secret") is None
