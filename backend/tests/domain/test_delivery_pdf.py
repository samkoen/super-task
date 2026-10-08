import zlib

from app.domain.delivery_pdf import attach_pdf_origins, produce_subtitles


def test_pdf_subtitle_is_the_mark_under_the_product():
    pdf = _pdf([
        (400, 500, "תפוח מוזהב יבוא"),
        (430, 490, "איטליה"),
        (420, 470, "מלפפון"),
    ])
    assert produce_subtitles(pdf) == [
        ("תפוח מוזהב יבוא", "איטליה"),
        ("מלפפון", None),
    ]


def test_pdf_mark_fills_a_line_only_when_agroline_sent_no_country():
    lines = [
        {"product_name": "תפוח מוזהב יבוא", "origin_name": None},
        {"product_name": "מלפפון", "origin_name": None},
        {"product_name": "עגבניות", "origin_name": "ספרד"},
    ]
    attach_pdf_origins(lines, _pdf([
        (400, 500, "תפוח מוזהב יבוא"),
        (430, 490, "איטליה"),
        (420, 470, "מלפפון"),
        (410, 440, "עגבניות"),
        (430, 430, "צרפת"),
    ]))
    assert lines[0]["origin_name"] == "איטליה"
    assert lines[1]["origin_name"] is None
    assert lines[2]["origin_name"] == "ספרד"


def test_origin_matches_even_when_the_pdf_lists_the_product_earlier():
    lines = [
        {"product_name": "אגס", "origin_name": None},
        {"product_name": "תפוח נאשי", "origin_name": None},
    ]
    attach_pdf_origins(lines, _pdf([
        (400, 500, "תפוח נאשי"),
        (430, 490, "סין"),
        (400, 470, "אגס"),
    ]))
    assert lines[0]["origin_name"] is None
    assert lines[1]["origin_name"] == "סין"


def test_variety_before_the_slash_still_matches_the_product():
    lines = [{"product_name": "תפוח מוזהב יבוא", "origin_name": None}]
    attach_pdf_origins(lines, _pdf([
        (400, 500, "ב.מ / תפוח מוזהב יבוא"),
        (430, 490, "איטליה"),
    ]))
    assert lines[0]["origin_name"] == "איטליה"


def test_a_broken_pdf_leaves_the_lines_unchanged():
    lines = [{"product_name": "תפוח מוזהב יבוא", "origin_name": None}]
    attach_pdf_origins(lines, b"%PDF not a delivery note")
    assert lines[0]["origin_name"] is None


def _pdf(cells: list[tuple[float, float, str]]) -> bytes:
    body = bytearray(b"BT ")
    for x_pos, y_pos, text in cells:
        body.extend(f"{x_pos:.2f} {y_pos:.2f} Td (".encode())
        body.extend(_visual(text).encode("utf-16-be"))
        body.extend(b") Tj ")
    body.extend(b"ET")
    compressed = zlib.compress(bytes(body))
    return b"%PDF-1.4\nstream\n" + compressed + b"\nendstream\n%%EOF"


def _visual(text: str) -> str:
    chars = list(text)
    index = 0
    while index < len(chars):
        if not ("\u0590" <= chars[index] <= "\u05ff"):
            index += 1
            continue
        end = index
        while end < len(chars) and ("\u0590" <= chars[end] <= "\u05ff" or chars[end] == " "):
            end += 1
        while end > index and chars[end - 1] == " ":
            end -= 1
        chars[index:end] = reversed(chars[index:end])
        index = end
    return "".join(chars)
