import type { TaskRecurrence } from "../services/taskService";
import { he } from "../i18n/he";

export const FIXED_RECURRENCE_OPTIONS: TaskRecurrence[] = ["daily", "weekly", "monthly"];

/** Ordre israélien : ראשון → שבת. Valeurs = Python weekday (Mon=0 … Sun=6). */
export const WEEKDAY_OPTIONS = [
  { value: "6", label: he.weekdaySun },
  { value: "0", label: he.weekdayMon },
  { value: "1", label: he.weekdayTue },
  { value: "2", label: he.weekdayWed },
  { value: "3", label: he.weekdayThu },
  { value: "4", label: he.weekdayFri },
  { value: "5", label: he.weekdaySat },
] as const;

export const ALL_WEEKDAYS = WEEKDAY_OPTIONS.map((d) => d.value).join(",");

/** יומית par défaut : tous les jours sauf שבת. */
export const DAILY_DEFAULT_WEEKDAYS = WEEKDAY_OPTIONS.filter((d) => d.value !== "5")
  .map((d) => d.value)
  .join(",");

const LABELS: Record<string, string> = Object.fromEntries(
  WEEKDAY_OPTIONS.map((d) => [d.value, d.label]),
);

const WEEKDAY_ORDER = WEEKDAY_OPTIONS.map((d) => d.value);

export function parseWeeklyDays(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => LABELS[part]);
}

export function joinWeeklyDays(days: string[]): string {
  const allowed = new Set(WEEKDAY_ORDER);
  return [...new Set(days.filter((d) => allowed.has(d)))]
    .sort((a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b))
    .join(",");
}

export function weekdaysForPicker(value: string | null | undefined): string[] {
  const parsed = parseWeeklyDays(value);
  return parsed.length > 0 ? parsed : [...WEEKDAY_ORDER];
}

export function defaultWeeklyDays(recurrence: string): string {
  if (recurrence === "weekly") return WEEKDAY_OPTIONS[0].value;
  return DAILY_DEFAULT_WEEKDAYS;
}

export function initialWeeklyDays(
  recurrence: string,
  stored?: string | null,
): string {
  const parsed = parseWeeklyDays(stored);
  if (recurrence === "weekly") return parsed[0] || WEEKDAY_OPTIONS[0].value;
  if (parsed.length) return joinWeeklyDays(parsed);
  return DAILY_DEFAULT_WEEKDAYS;
}

export function weekdaysOnRecurrenceChange(next: string, current: string): string {
  if (next === "weekly") return parseWeeklyDays(current)[0] || WEEKDAY_OPTIONS[0].value;
  if (next === "daily") return DAILY_DEFAULT_WEEKDAYS;
  return current;
}

export function usesWeeklyDays(recurrence: string): boolean {
  return recurrence === "daily" || recurrence === "weekly";
}

export function normalizeFixedRecurrence(value: string | null | undefined): TaskRecurrence {
  if (value === "weekly" || value === "monthly") return value;
  if (value === "biweekly") return "weekly";
  return "daily";
}

export function weeklyDaysPayload(
  recurrence: string,
  weeklyDays: string,
): string | undefined {
  if (!usesWeeklyDays(recurrence)) return undefined;
  return weeklyDays.trim() || undefined;
}

export function formatWeekdaysPart(weeklyDays: string | null | undefined): string {
  const days = parseWeeklyDays(weeklyDays);
  if (!days.length || days.length === WEEKDAY_OPTIONS.length) return "";
  return joinWeeklyDays(days)
    .split(",")
    .map((d) => LABELS[d])
    .join(", ");
}
