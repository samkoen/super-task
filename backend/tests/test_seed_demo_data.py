"""Tests helpers seed production."""
from scripts.seed_demo_data import seed_email


def test_seed_email_uses_super_nihul26_base():
    assert seed_email(101) == "super.nihul26+101@gmail.com"
