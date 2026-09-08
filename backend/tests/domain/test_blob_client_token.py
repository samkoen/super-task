from app.domain.blob_client_token import generate_blob_client_token, store_id_from_rw_token


def test_store_id_from_rw_token():
    assert store_id_from_rw_token("vercel_blob_rw_STORE99_secret") == "STORE99"
    assert store_id_from_rw_token("bad") == ""


def test_generate_blob_client_token_shape():
    token = generate_blob_client_token(
        read_write_token="vercel_blob_rw_STORE99_secret",
        pathname="task_videos/a.mp4",
        valid_until_ms=1_700_000_000_000,
        allowed_content_types=["video/mp4"],
        maximum_size_in_bytes=50 * 1024 * 1024,
    )
    assert token.startswith("vercel_blob_client_STORE99_")
    assert len(token) > 40


def test_generate_blob_client_token_rejects_invalid_secret():
    try:
        generate_blob_client_token(read_write_token="not-a-token", pathname="x.mp4")
    except ValueError as exc:
        assert "invalid" in str(exc)
    else:
        raise AssertionError("expected ValueError")
