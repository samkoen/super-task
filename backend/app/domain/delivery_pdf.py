"""Le texte sous le produit est la 2e ligne de la colonne זן/תוצרת du PDF."""
from __future__ import annotations

import re
import zlib

_PRODUCE_HEADER = "זן/תוצרת"
_MIN_X = 330.0
_MAX_X = 470.0


def attach_pdf_origins(lines: list[dict], pdf: bytes) -> None:
    try:
        marks = produce_subtitles(pdf)
    except (zlib.error, ValueError, UnicodeError):
        return
    used: set[int] = set()
    for line in lines:
        _apply_origin(line, marks, used)


def produce_subtitles(pdf: bytes) -> list[tuple[str, str | None]]:
    marks: list[tuple[str, str | None]] = []
    for stream in _streams(pdf):
        marks.extend(_rows(_cells(stream)))
    return marks


def _apply_origin(line: dict, marks: list[tuple[str, str | None]], used: set[int]) -> None:
    if line.get("origin_name"):
        return
    name = _fold(str(line.get("product_name") or ""))
    if not name:
        return
    for index, (label, origin) in enumerate(marks):
        if index in used or not origin or not _same_product(name, _fold(label)):
            continue
        line["origin_name"] = origin[:80]
        used.add(index)
        return


def _same_product(name: str, label: str) -> bool:
    return label == name or label.split(" / ")[-1].strip() == name


def _rows(cells: list[tuple[float, float, str]]) -> list[tuple[str, str | None]]:
    produce = [cell for cell in cells if _in_produce_column(cell)]
    produce.sort(key=lambda cell: -cell[0])
    rows: list[list] = []
    for y_pos, _x_pos, text in produce:
        if rows and 6 <= rows[-1][0] - y_pos <= 14:
            rows[-1][2] = text
            continue
        rows.append([y_pos, text, None])
    return [(text, origin) for _y_pos, text, origin in rows]


def _in_produce_column(cell: tuple[float, float, str]) -> bool:
    _y_pos, x_pos, text = cell
    return _MIN_X <= x_pos <= _MAX_X and text != _PRODUCE_HEADER and _has_hebrew(text)


def _cells(stream: bytes) -> list[tuple[float, float, str]]:
    cells = []
    for match in re.finditer(rb"([0-9.\-]+) ([0-9.\-]+) Td \(", stream):
        text = _logical(_decode(_read_literal(stream, match.end() - 1)))
        if text:
            cells.append((float(match.group(2)), float(match.group(1)), text))
    return cells


def _streams(pdf: bytes) -> list[bytes]:
    streams = []
    cursor = 0
    while True:
        found = pdf.find(b"stream", cursor)
        if found < 0:
            break
        start, end = pdf.find(b"\n", found), pdf.find(b"endstream", found)
        if start < 0 or end < 0:
            break
        streams.append(_inflate(pdf[start + 1 : end].strip(b"\r\n")))
        cursor = end + 9
    return [stream for stream in streams if b"Tj" in stream]


def _inflate(raw: bytes) -> bytes:
    try:
        return zlib.decompress(raw)
    except zlib.error:
        return raw


def _read_literal(stream: bytes, open_at: int) -> bytes:
    depth = 1
    index = open_at + 1
    out = bytearray()
    while index < len(stream) and depth:
        byte = stream[index]
        if byte == 92 and index + 1 < len(stream):
            out.append(_escaped(stream[index + 1]))
            index += 2
            continue
        depth += _paren_delta(byte)
        if depth:
            out.append(byte)
        index += 1
    return bytes(out)


def _paren_delta(byte: int) -> int:
    if byte == 40:
        return 1
    if byte == 41:
        return -1
    return 0


def _escaped(byte: int) -> int:
    return {110: 10, 114: 13, 116: 9, 98: 8, 102: 12, 40: 40, 41: 41, 92: 92}.get(byte, byte)


def _decode(raw: bytes) -> str:
    if len(raw) >= 2 and len(raw) % 2 == 0:
        try:
            return raw.decode("utf-16-be")
        except UnicodeDecodeError:
            pass
    return raw.decode("latin1", errors="replace")


def _logical(value: str) -> str:
    chars = list(value)
    index = 0
    while index < len(chars):
        if not _hebrew(chars[index]):
            index += 1
            continue
        end = _hebrew_run(chars, index)
        chars[index:end] = reversed(chars[index:end])
        index = end
    return "".join(chars).strip()


def _hebrew_run(chars: list[str], index: int) -> int:
    end = index
    while end < len(chars) and (_hebrew(chars[end]) or chars[end] == " "):
        end += 1
    while end > index and chars[end - 1] == " ":
        end -= 1
    return end


def _has_hebrew(text: str) -> bool:
    return any(_hebrew(char) for char in text)


def _hebrew(char: str) -> bool:
    return "\u0590" <= char <= "\u05ff"


def _fold(value: str) -> str:
    return " ".join(value.split())
