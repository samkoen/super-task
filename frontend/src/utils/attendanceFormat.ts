export function formatDurationMinutes(
  minutes: number | null | undefined,
  labels: { hours: string; minutes: string },
): string {
  if (minutes == null || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}${labels.minutes}`;
  return m ? `${h}${labels.hours} ${m}${labels.minutes}` : `${h}${labels.hours}`;
}

export function uniqueAnomalyCodes(anomalies: { code: string }[]): string[] {
  const seen = new Set<string>();
  const codes: string[] = [];
  for (const item of anomalies) {
    if (seen.has(item.code)) continue;
    seen.add(item.code);
    codes.push(item.code);
  }
  return codes;
}
