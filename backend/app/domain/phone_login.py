"""Identifiant de connexion : téléphone (chiffres) ou email."""
from __future__ import annotations

import re

_BIDI = re.compile(r"[\u200e\u200f\ufeff]")
_NON_DIGIT = re.compile(r"\D")


def strip_bidi(text: str) -> str:
    return _BIDI.sub("", text or "").strip()


def looks_like_phone(raw: str) -> bool:
    digits = _NON_DIGIT.sub("", strip_bidi(raw))
    return 9 <= len(digits) <= 13


def normalize_phone(raw: str) -> str:
    digits = _NON_DIGIT.sub("", strip_bidi(raw))
    if digits.startswith("972") and len(digits) >= 11:
        digits = "0" + digits[3:]
    if len(digits) < 9:
        raise ValueError("מספר טלפון לא תקין")
    return digits


def login_key(raw: str) -> str:
    """Canonise le champ login : téléphone normalisé, sinon email en minuscules."""
    text = strip_bidi(raw)
    if looks_like_phone(text):
        return normalize_phone(text)
    return text.lower()
