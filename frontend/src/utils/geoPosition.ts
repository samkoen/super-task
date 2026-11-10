import type { CaptureLocation } from "./geoCheck";

type GeoApi = Pick<Geolocation, "getCurrentPosition">;

const TIMEOUT_MS = 8000;
/** Une position récente (< 2 min) suffit : l'oved ne reste pas à attendre le GPS. */
const MAX_AGE_MS = 120_000;

/**
 * Position de l'appareil au moment du tournage. Jamais bloquant : refus, absence de capteur
 * ou délai dépassé donnent `null` et la revue n'affiche simplement pas de contrôle GPS.
 */
export function getCurrentLocation(
  geo: GeoApi | undefined = typeof navigator !== "undefined" ? navigator.geolocation : undefined,
  timeoutMs: number = TIMEOUT_MS,
): Promise<CaptureLocation | null> {
  if (!geo) return Promise.resolve(null);
  return new Promise((resolve) => {
    const fallback = window.setTimeout(() => resolve(null), timeoutMs + 500);
    const done = (value: CaptureLocation | null) => {
      window.clearTimeout(fallback);
      resolve(value);
    };
    try {
      geo.getCurrentPosition(
        ({ coords }) => done({ lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy }),
        () => done(null),
        { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: MAX_AGE_MS },
      );
    } catch {
      done(null);
    }
  });
}
