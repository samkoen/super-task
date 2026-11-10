"""Position GPS (règles pures, sans I/O) : coordonnées d'un snif et lieu où un média a été filmé."""

from __future__ import annotations

import math

_BAD_COORDS = "מיקום לא תקין"
_ONE_COORD = "יש להזין קו רוחב וגם קו אורך"
_EARTH_RADIUS_M = 6_371_000.0
MAX_ACCURACY_M = 100_000.0


def _parse_number(value: object, low: float, high: float) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float, str)):
        raise ValueError(_BAD_COORDS)
    try:
        number = float(value)
    except ValueError as exc:
        raise ValueError(_BAD_COORDS) from exc
    if not math.isfinite(number) or number < low or number > high:
        raise ValueError(_BAD_COORDS)
    return number


def _is_blank(value: object) -> bool:
    return value is None or (isinstance(value, str) and not value.strip())


def normalize_coordinates(latitude: object, longitude: object) -> tuple[float, float] | None:
    """Couple (lat, lng) valide, ou None si les deux sont vides ; l'un sans l'autre est refusé."""
    if _is_blank(latitude) and _is_blank(longitude):
        return None
    if _is_blank(latitude) or _is_blank(longitude):
        raise ValueError(_ONE_COORD)
    return _parse_number(latitude, -90, 90), _parse_number(longitude, -180, 180)


def normalize_location(raw: object) -> dict | None:
    """Lieu de tournage envoyé par l'appareil : {lat, lng, accuracy?}. Invalide → None (jamais bloquant)."""
    if not isinstance(raw, dict):
        return None
    try:
        coords = normalize_coordinates(raw.get("lat"), raw.get("lng"))
    except ValueError:
        return None
    if coords is None:
        return None
    entry: dict = {"lat": round(coords[0], 6), "lng": round(coords[1], 6)}
    try:
        accuracy = _parse_number(raw.get("accuracy"), 0, MAX_ACCURACY_M)
    except ValueError:
        return entry
    entry["accuracy"] = round(accuracy, 1)
    return entry


def distance_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Distance à vol d'oiseau (haversine)."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = phi2 - phi1
    d_lambda = math.radians(lng2 - lng1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * _EARTH_RADIUS_M * math.asin(min(1.0, math.sqrt(a)))
