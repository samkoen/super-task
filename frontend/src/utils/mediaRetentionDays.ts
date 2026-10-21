export const MIN_RETENTION_DAYS = 0;
export const MAX_RETENTION_DAYS = 365;

export function parseRetentionDays(raw: string): number | null {
  const text = raw.trim();
  if (!/^\d+$/.test(text)) return null;
  const days = Number(text);
  if (days > MAX_RETENTION_DAYS) return null;
  return days;
}
