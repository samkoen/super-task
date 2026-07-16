export function todayIso(): string {
  return formatDateIso(new Date());
}

export function formatDateIso(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

export function shiftDay(iso: string, delta: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return formatDateIso(d);
}

export function isToday(iso: string): boolean {
  return iso === todayIso();
}

export function formatHebrewDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function weekRangeAround(iso: string): { from: string; to: string } {
  const d = new Date(`${iso}T12:00:00`);
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { from: formatDateIso(start), to: formatDateIso(end) };
}

export function defaultRangeFrom(iso: string, days = 7): { from: string; to: string } {
  return { from: iso, to: shiftDay(iso, days - 1) };
}

export function formatHebrewDayShort(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("he-IL", { weekday: "short", day: "numeric", month: "short" });
}

export function dueDateIso(isoDateTime: string): string {
  return isoDateTime.slice(0, 10);
}

export function groupTasksByDay<T extends { due_at: string }>(tasks: T[]): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const task of tasks) {
    const day = dueDateIso(task.due_at);
    const bucket = map.get(day);
    if (bucket) bucket.push(task);
    else map.set(day, [task]);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function formatDueAt(isoDateTime: string | null | undefined, now = new Date()): string {
  if (!isoDateTime?.trim()) return "—";
  const value = new Date(isoDateTime);
  if (Number.isNaN(value.getTime())) return "—";
  const time = value.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  if (formatDateIso(value) === formatDateIso(now)) {
    return time;
  }
  const date = value.toLocaleDateString("he-IL", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
  return `${date} ${time}`;
}

export type TaskDateViewMode = "day" | "range";

export function datetimeLocalForDay(dayIso: string, reference = new Date()): string {
  const [year, month, day] = dayIso.split("-").map(Number);
  const value = new Date(year, month - 1, day, reference.getHours(), reference.getMinutes());
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
