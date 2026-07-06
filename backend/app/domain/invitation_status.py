"""Statuts d'une invitation utilisateur."""

PENDING = "pending"
ACCEPTED = "accepted"
CANCELLED = "cancelled"
EXPIRED = "expired"

ALL = frozenset({PENDING, ACCEPTED, CANCELLED, EXPIRED})
