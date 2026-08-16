"""Tests parseur new_reshet_subscription.txt."""

from pathlib import Path

import pytest

from app.domain.new_reshet_subscription import (
    SubscriptionOved,
    SubscriptionSnif,
    login_email,
    oved_login,
    ovdim_with_snifim,
    parse_ovdim_list,
    parse_oved_to_snif_line,
    parse_reshet_line,
    parse_subscription_text,
    person_login,
    split_person_name,
)
from app.domain.phone_login import login_key, normalize_phone


SAMPLE = """
reshet Super Fresh - דוד לוי
snif תל אביב:  ראובן - שמעון - לוי (ovdim du snif)
snif חיפה: יהודה - דן
"""

YERAKOT = """
reshet - 0556659172 - ירקות - יצחק ריצ'רד
0528716886- אחמד קאטוש :	שפע המגיד ממזריטש
0586301489 - עלי קצקץ : 	שפע ברוק
0568525474 - יזיד עמרו:	שפע כנסת יחזקאל
0506785690 - מאיר טוויטו:	שפע הרב שך
0598266536 - איברהים אהדי:	שפע בבא סאלי
0536894986 - מיכאל :	שפע כף החיים
0597832511 - מולוד קאטוש	:שפע רבי עקיבא
0522356991 - אברהם גואלי:	שפע החיד"א
0555025572 - אורי מזרחי:	שפע האמוראים
0555025572 - אורי מזרחי:	שפע בן איש חי
\u200e0527199520 - מרדכי ייגר:	יד השם ביתר
"""


def test_parse_subscription_nominal():
    sub = parse_subscription_text(SAMPLE)
    assert sub.reshet_name == "Super Fresh"
    assert sub.menahel_reshet == "דוד לוי"
    assert [s.name for s in sub.snifim] == ["תל אביב", "חיפה"]
    assert [o.name for o in sub.snifim[0].ovdim] == ["ראובן", "שמעון", "לוי"]
    assert [o.name for o in sub.snifim[1].ovdim] == ["יהודה", "דן"]


def test_parse_ignores_parentheses_and_spaces():
    assert parse_ovdim_list("  א  - ב - ג  (commentaire) ") == ("א", "ב", "ג")
    assert parse_ovdim_list("d - e -f") == ("d", "e", "f")


def test_hebrew_prefixes():
    sub = parse_subscription_text("רשת אלון - משה כהן\nסניף א: עובד א - עובד ב\n")
    assert sub.reshet_name == "אלון"
    assert sub.menahel_reshet == "משה כהן"
    assert sub.snifim[0].name == "א"


def test_missing_reshet_raises():
    with pytest.raises(ValueError, match="חסרה שורת reshet"):
        parse_subscription_text("snif a: x - y\n")


def test_parse_oved_colon_snif_file():
    sub = parse_subscription_text(YERAKOT)
    assert sub.reshet_name == "ירקות"
    assert sub.menahel_reshet == "יצחק ריצ'רד"
    assert sub.menahel_phone == "0556659172"
    assert len(sub.snifim) == 11
    assert sub.snifim[0].name == "שפע המגיד ממזריטש"
    assert sub.snifim[0].ovdim == (SubscriptionOved(name="אחמד קאטוש", phone="0528716886"),)
    assert sub.snifim[5].ovdim == (SubscriptionOved(name="מיכאל", phone="0536894986"),)
    assert sub.snifim[8].ovdim[0].phone == "0555025572"
    assert sub.snifim[9].name == "שפע בן איש חי"
    assert sub.snifim[9].ovdim[0].name == "אורי מזרחי"
    assert sub.snifim[-1].name == "יד השם ביתר"
    assert sub.snifim[-1].ovdim[0].phone == "0527199520"


def test_same_phone_two_snifim_is_one_oved():
    sub = parse_subscription_text(YERAKOT)
    merged = ovdim_with_snifim(sub.snifim)
    assert len(merged) == 10
    uri = next(o for o, _ in merged if o.phone == "0555025572")
    snifs = dict(merged)[uri]
    assert snifs == ("שפע האמוראים", "שפע בן איש חי")
    assert oved_login(uri, index=9) == "0555025572"


def test_groups_several_ovdim_same_snif():
    text = "reshet - ירקות - יצחק\n0501111111 - ראובן : סניף א\n0502222222 - שמעון : סניף א\n"
    sub = parse_subscription_text(text)
    assert sub.snifim == (
        SubscriptionSnif(
            name="סניף א",
            ovdim=(
                SubscriptionOved(name="ראובן", phone="0501111111"),
                SubscriptionOved(name="שמעון", phone="0502222222"),
            ),
        ),
    )


def test_parse_oved_line_phone_dash_name():
    oved, snif = parse_oved_to_snif_line("0528716886- אחמד קאטוש : שפע ברוק")
    assert oved.phone == "0528716886"
    assert oved.name == "אחמד קאטוש"
    assert snif == "שפע ברוק"


def test_parse_oved_line_normalizes_dashed_phone():
    oved, snif = parse_oved_to_snif_line("052-871-6886 - אחמד קאטוש : שפע ברוק")
    assert oved.phone == "0528716886"
    assert oved.name == "אחמד קאטוש"
    assert snif == "שפע ברוק"


def test_oved_line_without_phone_raises():
    with pytest.raises(ValueError, match="טלפון"):
        parse_oved_to_snif_line("אחמד קאטוש : שפע ברוק")


def test_parse_reshet_line_with_phone():
    name, menahel, phone = parse_reshet_line("reshet - 0556659172 - ירקות - יצחק ריצ'רד")
    assert (name, menahel, phone) == ("ירקות", "יצחק ריצ'רד", "0556659172")


def test_menahel_login_uses_phone():
    assert person_login(name="יצחק", phone="0556659172", role_tag="reshet", index=0) == "0556659172"


def test_parse_repo_subscription_file():
    path = Path(__file__).resolve().parents[3] / "new_reshet_subscription.txt"
    sub = parse_subscription_text(path.read_text(encoding="utf-8"))
    assert sub.reshet_name == "ירקות"
    assert sub.menahel_phone == "0556659172"
    assert sub.menahel_reshet == "יצחק ריצ'רד"
    assert len(sub.snifim) == 11
    merged = ovdim_with_snifim(sub.snifim)
    assert len(merged) == 10
    uri = next(o for o, _ in merged if o.phone == "0555025572")
    assert dict(merged)[uri] == ("שפע האמוראים", "שפע בן איש חי")


def test_split_and_email():
    assert split_person_name("דוד לוי") == ("דוד", "לוי")
    assert split_person_name("ראובן") == ("ראובן", "ראובן")
    mail = login_email(full_name="John Doe", role_tag="oved", index=2)
    assert mail.startswith("oved.2.john.doe@")
    he_mail = login_email(full_name="ראובן", role_tag="oved", index=1)
    assert he_mail.startswith("oved.1.u")
    assert he_mail.endswith("@super.local")


def test_login_key_phone_and_email():
    assert login_key("052-871-6886") == "0528716886"
    assert login_key("  Foo@Bar.COM ") == "foo@bar.com"
    assert normalize_phone("+972528716886") == "0528716886"
