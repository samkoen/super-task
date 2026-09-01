const STORAGE_KEY = "system-bug-trail";
export const ROUTE_TRAIL_MAX = 8;

export function pushRouteTrail(path: string, previous: string[] = readRouteTrail()): string[] {
  const next = path.trim();
  if (!next) return previous.slice(-ROUTE_TRAIL_MAX);
  const trail = previous[previous.length - 1] === next ? previous : [...previous, next];
  const clipped = trail.slice(-ROUTE_TRAIL_MAX);
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(clipped));
  } catch {
    // sessionStorage can fail in private WebViews
  }
  return clipped;
}

export function readRouteTrail(): string[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}
