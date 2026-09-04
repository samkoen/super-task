from app.domain.chat_file import clip_file_name, stored_file_name


def test_clip_file_name_keeps_the_basename():
    assert clip_file_name(r"C:\tmp\דוח.pdf") == "דוח.pdf"
    assert clip_file_name("  ") is None
    assert clip_file_name("a" * 250) == "a" * 200


def test_stored_name_falls_back_when_a_file_is_present():
    assert stored_file_name(None, has_file=False) is None
    assert stored_file_name("", has_file=True) == "קובץ"
    assert stored_file_name("invoice.xlsx", has_file=True) == "invoice.xlsx"
