export function formatTime(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return "—";
  return value.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

export function formatDurationMinutes(minutes: number | null | undefined): string {
  if (minutes == null || minutes < 0) return "—";
  if (minutes < 60) return `${minutes} דק'`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} ש' ${rest} דק'` : `${hours} ש'`;
}
