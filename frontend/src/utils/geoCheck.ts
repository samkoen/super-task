/** Contrôle GPS de la revue vidéo (Figma 08) : le média a-t-il été tourné au snif ? */

export type GeoPoint = { lat: number; lng: number };
export type CaptureLocation = GeoPoint & { accuracy?: number };

/** Rayon autour du snif dans lequel un tournage est considéré comme fait au snif. */
export const BRANCH_RADIUS_M = 300;
/** Une position très imprécise (Wi-Fi, intérieur) ne donne au plus que cette marge. */
export const MAX_ACCURACY_BONUS_M = 200;

const EARTH_RADIUS_M = 6_371_000;

export type LocationVerdict = "at_branch" | "away" | "unknown";

function isPoint(value: unknown): value is GeoPoint {
  const point = value as Partial<GeoPoint> | null | undefined;
  return (
    !!point &&
    typeof point.lat === "number" &&
    typeof point.lng === "number" &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng)
  );
}

/** Distance à vol d'oiseau en mètres (haversine). */
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** « unknown » : pas de position ou pas de coordonnées de snif — on n'affirme rien. */
export function locationVerdict(
  location: CaptureLocation | null | undefined,
  branchCenter: GeoPoint | null | undefined,
  radiusM: number = BRANCH_RADIUS_M,
): LocationVerdict {
  if (!isPoint(location) || !isPoint(branchCenter)) return "unknown";
  const bonus = Math.min(Math.max(location.accuracy ?? 0, 0), MAX_ACCURACY_BONUS_M);
  return distanceMeters(location, branchCenter) <= radiusM + bonus ? "at_branch" : "away";
}
