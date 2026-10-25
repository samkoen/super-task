"""Règles pures — adaptations par snif d'une tâche קבועה du réseau.

Une tâche réseau = une copie par snif (même `network_group_id`). Chaque copie
mémorise les champs qu'un snif a adaptés (`overridden_fields`) : une
modification des réglages généraux ne les écrase pas.
"""
from __future__ import annotations

from collections import Counter

# Champ « logique » -> attributs du template qu'il recouvre.
FIELD_ATTRS: dict[str, tuple[str, ...]] = {
    "due_time": ("due_time",),
    "weekly_days": ("weekly_days",),
    "is_active": ("is_active",),
    "description": ("description",),
    "reference_media": ("reference_photo_url", "reference_video_url", "reference_audio_url"),
    "start_url": ("start_url",),
}
OVERRIDABLE_FIELDS: tuple[str, ...] = tuple(FIELD_ATTRS)

# L'assigné est toujours propre au snif : jamais marqué « adapté ».
ALWAYS_LOCAL_ATTRS = ("assignee_user_id",)


def normalize_fields(raw) -> list[str]:
    """Garde les champs connus, sans doublon, dans l'ordre canonique."""
    wanted = {str(f) for f in (raw or [])}
    return [f for f in OVERRIDABLE_FIELDS if f in wanted]


def overridden_of(template) -> list[str]:
    return normalize_fields(getattr(template, "overridden_fields", None))


def field_value(template, field: str) -> tuple:
    return tuple(_clean(getattr(template, attr, None)) for attr in FIELD_ATTRS[field])


def _clean(value):
    if isinstance(value, str):
        return value.strip() or None
    return value


def _most_common(values: list[tuple]) -> tuple:
    counts = Counter(values)
    best = max(counts.values())
    for value in values:  # ordre stable : le plus ancien gagne l'égalité
        if counts[value] == best:
            return value
    return values[0]


def group_default(templates: list, field: str) -> tuple:
    """Valeur par défaut : la plus courante parmi les snifim non adaptés (sinon tous)."""
    free = [t for t in templates if field not in overridden_of(t)]
    pool = free or templates
    return _most_common([field_value(t, field) for t in pool])


def group_defaults(templates: list) -> dict:
    """Valeurs par défaut à plat (attribut -> valeur) pour tous les champs adaptables."""
    out: dict = {}
    if not templates:
        return out
    for field, attrs in FIELD_ATTRS.items():
        for attr, value in zip(attrs, group_default(templates, field)):
            out[attr] = value
    return out


def preserve_overrides(payload: dict, sibling) -> dict:
    """Copie de `payload` où les champs adaptés du snif gardent leur valeur."""
    merged = dict(payload)
    for field in overridden_of(sibling):
        for attr in FIELD_ATTRS[field]:
            merged[attr] = getattr(sibling, attr, None)
        if field == "start_url":
            merged["update_start_url"] = False
    return merged


def fields_touched(changes: dict) -> list[str]:
    """Champs logiques concernés par un dict d'attributs modifiés."""
    return [
        field
        for field, attrs in FIELD_ATTRS.items()
        if any(attr in changes for attr in attrs)
    ]


def next_overridden(
    template, defaults: dict, changes: dict, reset: list[str]
) -> list[str]:
    """Nouveau jeu de champs adaptés après `changes` (valeurs posées) et `reset`."""
    current = set(overridden_of(template))
    for field in fields_touched(changes):
        same = all(
            _clean(changes.get(attr, defaults.get(attr))) == _clean(defaults.get(attr))
            for attr in FIELD_ATTRS[field]
        )
        (current.discard if same else current.add)(field)
    current -= set(normalize_fields(reset))
    return normalize_fields(current)


def reset_values(defaults: dict, reset: list[str]) -> dict:
    """Attributs à recopier depuis les valeurs par défaut pour les champs réinitialisés."""
    return {
        attr: defaults.get(attr)
        for field in normalize_fields(reset)
        for attr in FIELD_ATTRS[field]
    }


def group_key(template) -> str:
    """Clé stable d'une tâche : l'id du groupe réseau, sinon l'id de la copie unique."""
    return getattr(template, "network_group_id", None) or template.id


def split_into_groups(templates: list) -> list[list]:
    """Regroupe les copies d'une même tâche ; chaque membre trié par ancienneté."""
    buckets: dict[str, list] = {}
    for template in templates:
        buckets.setdefault(group_key(template), []).append(template)
    ordered = [sorted(m, key=lambda t: (t.created_at or "", t.id)) for m in buckets.values()]
    return sorted(ordered, key=lambda m: (m[0].title or "").casefold())


def local_attrs_allowed() -> set[str]:
    """Attributs qu'un snif peut modifier pour lui seul."""
    attrs = {a for group in FIELD_ATTRS.values() for a in group}
    return attrs | set(ALWAYS_LOCAL_ATTRS)
