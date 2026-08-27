from app.domain.chat_page import (
    DEFAULT_CHAT_PAGE_SIZE,
    MAX_CHAT_PAGE_SIZE,
    clamp_chat_page_size,
    page_from_newest_first,
)


def test_clamp_defaults_and_caps():
    assert clamp_chat_page_size(None) == DEFAULT_CHAT_PAGE_SIZE
    assert clamp_chat_page_size(0) == DEFAULT_CHAT_PAGE_SIZE
    assert clamp_chat_page_size(-3) == DEFAULT_CHAT_PAGE_SIZE
    assert clamp_chat_page_size(999) == MAX_CHAT_PAGE_SIZE
    assert clamp_chat_page_size(10) == 10


def test_page_keeps_newest_slice_in_chronological_order():
    rows = ["m5", "m4", "m3", "m2", "m1"]
    page = page_from_newest_first(rows, 3)
    assert page.items == ["m3", "m4", "m5"]
    assert page.has_more is True


def test_page_without_overflow_has_no_more():
    page = page_from_newest_first(["b", "a"], 10)
    assert page.items == ["a", "b"]
    assert page.has_more is False
