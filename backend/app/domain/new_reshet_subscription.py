"""Parseur du fichier new_reshet_subscription.txt (רשת / סניפים / עובדים)."""
from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field

from app.domain.phone_login import looks_like_phone, normalize_phone, strip_bidi

_COMMENT = re.compile(r"\([^)]*\)")
_RESHE_PREFIX = re.compile(r"^(?:reshet|רשת)\s+", re.IGNORECASE)
_SNIF_PREFIX = re.compile(r"^(?:snif|סניף)\s+", re.IGNORECASE)


@dataclass(frozen=True)
class SubscriptionOved:
    name: str
    phone: str | None = None


@dataclass(frozen=True)
class SubscriptionSnif:
    name: str
    ovdim: tuple[SubscriptionOved, ...]


@dataclass(frozen=True)
class ReshetSubscription:
    reshet_name: str
    menahel_reshet: str
    snifim: tuple[SubscriptionSnif, ...] = field(default_factory=tuple)
    menahel_phone: str | None = None


def strip_inline_comment(line: str) -> str:
    return strip_bidi(_COMMENT.sub("", line))


def split_person_name(full: str) -> tuple[str, str]:
    parts = full.strip().split(maxsplit=1)
    if not parts:
        raise ValueError("שם ריק")
    if len(parts) == 1:
        return parts[0], parts[0]
    return parts[0], parts[1]


def email_local_part(full_name: str) -> str:
    ascii_slug = re.sub(r"[^a-z0-9]+", ".", full_name.lower())
    ascii_slug = ascii_slug.strip(".")
    if ascii_slug:
        return ascii_slug[:40]
    digest = hashlib.sha1(full_name.encode("utf-8")).hexdigest()[:8]
    return f"u{digest}"


def login_email(*, full_name: str, role_tag: str, index: int) -> str:
    local = email_local_part(full_name)
    return f"{role_tag}.{index}.{local}@super.local"


def person_login(*, name: str, phone: str | None, role_tag: str, index: int) -> str:
    if phone:
        return phone
    return login_email(full_name=name, role_tag=role_tag, index=index)


def oved_login(oved: SubscriptionOved, *, index: int) -> str:
    return person_login(name=oved.name, phone=oved.phone, role_tag="oved", index=index)


def parse_ovdim_list(raw: str) -> tuple[str, ...]:
    cleaned = strip_inline_comment(raw)
    if not cleaned:
        return ()
    parts = re.split(r"\s*-\s*", cleaned)
    return tuple(p.strip() for p in parts if p.strip())


_PHONE_THEN_REST = re.compile(r"^((?:\+972)?0?\d[\d\s\-]*\d)\s*-?\s*(.+)$")


def parse_reshet_line(line: str) -> tuple[str, str, str | None]:
    """`reshet - <tel> - <רשת> - <מנהל>` ou `reshet <רשת> - <מנהל>`."""
    body = _RESHE_PREFIX.sub("", strip_inline_comment(line), count=1).strip()
    body = body.lstrip("-").strip()
    parts = re.split(r"\s*-\s*", body)
    phone = None
    if parts and looks_like_phone(parts[0]):
        phone = normalize_phone(parts[0])
        parts = parts[1:]
    if len(parts) < 2:
        raise ValueError("שורה רשת לא תקינה (חסר ' - ' בין שם הרשת למנהל)")
    menahel = parts[-1].strip()
    reshet_name = " - ".join(parts[:-1]).strip()
    if not reshet_name or not menahel:
        raise ValueError("שורה רשת לא תקינה")
    return reshet_name, menahel, phone


def parse_snif_line(line: str) -> SubscriptionSnif:
    body = _SNIF_PREFIX.sub("", strip_inline_comment(line), count=1).strip()
    if ":" not in body:
        raise ValueError("שורה סניף לא תקינה (חסר ':')")
    name, ovdim_raw = body.split(":", 1)
    name = name.strip()
    if not name:
        raise ValueError("שם סניף ריק")
    ovdim = tuple(SubscriptionOved(name=n) for n in parse_ovdim_list(ovdim_raw))
    return SubscriptionSnif(name=name, ovdim=ovdim)


def split_phone_and_name(left: str) -> tuple[str, str]:
    """Sépare `0556659172 - יצחק` (tiret optionnel, espaces variables)."""
    match = _PHONE_THEN_REST.match(strip_bidi(left))
    if not match:
        raise ValueError("חסר מספר טלפון או שם עובד")
    name = match.group(2).strip().lstrip("-").strip()
    if not name:
        raise ValueError("שם עובד ריק")
    return normalize_phone(match.group(1)), name


def parse_oved_to_snif_line(line: str) -> tuple[SubscriptionOved, str]:
    """Format: '<téléphone> - <oved> : <snif>'."""
    body = strip_inline_comment(line)
    if ":" not in body:
        raise ValueError("שורה עובד/סניף לא תקינה")
    left, snif = body.split(":", 1)
    snif = snif.strip()
    phone, name = split_phone_and_name(left)
    if not snif:
        raise ValueError("שורה עובד/סניף לא תקינה")
    return SubscriptionOved(name=name, phone=phone), snif


def _group_ovdim_by_snif(pairs: list[tuple[SubscriptionOved, str]]) -> list[SubscriptionSnif]:
    order: list[str] = []
    grouped: dict[str, list[SubscriptionOved]] = {}
    for oved, snif in pairs:
        if snif not in grouped:
            grouped[snif] = []
            order.append(snif)
        grouped[snif].append(oved)
    return [SubscriptionSnif(name=name, ovdim=tuple(grouped[name])) for name in order]


def ovdim_with_snifim(
    snifim: tuple[SubscriptionSnif, ...],
) -> tuple[tuple[SubscriptionOved, tuple[str, ...]], ...]:
    """Un oved (téléphone) → tous ses סניפים, dans l'ordre d'apparition."""
    order: list[str] = []
    by_key: dict[str, tuple[SubscriptionOved, list[str]]] = {}
    for snif in snifim:
        for oved in snif.ovdim:
            key = oved.phone or f"name:{oved.name}"
            if key not in by_key:
                by_key[key] = (oved, [])
                order.append(key)
            _, names = by_key[key]
            if snif.name not in names:
                names.append(snif.name)
    return tuple((by_key[k][0], tuple(by_key[k][1])) for k in order)


def parse_subscription_text(text: str) -> ReshetSubscription:
    reshet_name = ""
    menahel = ""
    menahel_phone = None
    snifim: list[SubscriptionSnif] = []
    oved_pairs: list[tuple[SubscriptionOved, str]] = []
    for raw in text.splitlines():
        line = strip_inline_comment(raw)
        if not line or line.startswith("#"):
            continue
        if _RESHE_PREFIX.match(line):
            reshet_name, menahel, menahel_phone = parse_reshet_line(line)
            continue
        if _SNIF_PREFIX.match(line):
            snifim.append(parse_snif_line(line))
            continue
        if ":" in line:
            oved_pairs.append(parse_oved_to_snif_line(line))
            continue
        raise ValueError(f"שורה לא מזוהה: {raw.strip()}")
    if not reshet_name or not menahel:
        raise ValueError("חסרה שורת reshet")
    if oved_pairs:
        snifim.extend(_group_ovdim_by_snif(oved_pairs))
    if not snifim:
        raise ValueError("חסר לפחות סניף אחד")
    return ReshetSubscription(reshet_name, menahel, tuple(snifim), menahel_phone)
