from app.realtime.sse_stream_limits import stream_max_seconds, stream_time_is_up


def test_stream_max_seconds_unlimited_on_long_running_host():
    assert stream_max_seconds() is None


def test_stream_time_is_up_ignores_local_unlimited_stream():
    assert stream_time_is_up(0, 10_000, None) is False


def test_stream_time_is_up_after_cap():
    assert stream_time_is_up(100, 189, 90) is False
    assert stream_time_is_up(100, 190, 90) is True
