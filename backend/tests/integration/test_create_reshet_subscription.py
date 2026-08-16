"""Création רשת depuis le fichier : login téléphone + oved multi-snif."""
from __future__ import annotations

import app.db.session as db_session
from app.domain.new_reshet_subscription import parse_subscription_text
from app.repositories.user_branch_membership_repository import UserBranchMembershipRepository
from app.repositories.user_repository import UserRepository
from scripts.create_reshet_from_subscription import apply_subscription

SAMPLE = """
reshet - 0556659172 - ירקות - יצחק ריצ'רד
0555025572 - אורי מזרחי:	שפע האמוראים
0555025572 - אורי מזרחי:	שפע בן איש חי
0528716886- אחמד קאטוש :	שפע המגיד ממזריטש
"""


def test_apply_subscription_phone_login_multi_snif(app_env):
    assert db_session.SessionLocal is not None
    db = db_session.SessionLocal()
    try:
        creds = apply_subscription(db, parse_subscription_text(SAMPLE))
        db.commit()
        uri = UserRepository(db).find_by_email("0555025572")
        assert uri is not None
        assert uri.phone == "0555025572"
        member_ids = UserBranchMembershipRepository(db).list_branch_ids_for_user(uri.id)
        assert len(member_ids) == 2
        ahmad = UserRepository(db).find_by_email("0528716886")
        assert ahmad is not None
        logins = [login for _, _, login in creds]
        assert logins.count("0555025572") == 1
        assert "0528716886" in logins
        assert "0556659172" in logins
        menahel = UserRepository(db).find_by_email("0556659172")
        assert menahel is not None
        assert menahel.phone == "0556659172"
    finally:
        db.close()
