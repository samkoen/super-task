"""Pagination curseur des fils chat (plus récents d'abord, puis older)."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence, TypeVar

DEFAULT_CHAT_PAGE_SIZE = 30
MAX_CHAT_PAGE_SIZE = 50

T = TypeVar("T")


@dataclass(frozen=True)
class ChatPage:
    items: list
    has_more: bool


def clamp_chat_page_size(limit: int | None) -> int:
    if limit is None:
        return DEFAULT_CHAT_PAGE_SIZE
    try:
        n = int(limit)
    except (TypeError, ValueError):
        return DEFAULT_CHAT_PAGE_SIZE
    if n < 1:
        return DEFAULT_CHAT_PAGE_SIZE
    return min(n, MAX_CHAT_PAGE_SIZE)


def page_from_newest_first(rows: Sequence[T], limit: int) -> ChatPage:
    """`rows` déjà triés du plus récent au plus ancien, éventuellement limit+1."""
    has_more = len(rows) > limit
    chronological = list(reversed(list(rows)[:limit]))
    return ChatPage(items=chronological, has_more=has_more)
