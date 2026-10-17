/** Heure locale sur 24 h, format HH:MM (ex. 07:28). */
export function formatClockTime(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
}
