const SEEN_KEY = "super:seen-chat-alerts";

export function loadSeenAlertIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

export function rememberAlertIds(ids: Iterable<string>): void {
  const next = loadSeenAlertIds();
  for (const id of ids) next.add(id);
  sessionStorage.setItem(SEEN_KEY, JSON.stringify([...next]));
}
