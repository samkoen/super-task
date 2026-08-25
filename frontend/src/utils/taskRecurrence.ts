import type { TaskRecurrence } from "../services/taskService";
import { he } from "../i18n/he";

export const FIXED_RECURRENCE_OPTIONS: TaskRecurrence[] = ["daily", "weekly", "monthly"];

export const WEEKDAY_OPTIONS = [
  { value: "0", label: he.weekdayMon },
  { value: "1", label: he.weekdayTue },
  { value: "2", label: he.weekdayWed },
  { value: "3", label: he.weekdayThu },
  { value: "4", label: he.weekdayFri },
  { value: "5", label: he.weekdaySat },
  { value: "6", label: he.weekdaySun },
] as const;

export const ALL_WEEKDAYS = WEEKDAY_OPTIONS.map((d) => d.value).join(",");

const LABELS: Record<string, string> = Object.fromEntries(
  WEEKDAY_OPTIONS.map((d) => [d.value, d.label]),
);

export function parseWeeklyDays(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => LABELS[part]);
}

export function joinWeeklyDays(days: string[]): string {
  const allowed = new Set(WEEKDAY_OPTIONS.map((d) => d.value));
  return [...new Set(days.filter((d) => allowed.has(d)))]
    .sort((a, b) => Number(a) - Number(b))
    .join(",");
}

export function weekdaysForPicker(value: string | null | undefined): string[] {
  const parsed = parseWeeklyDays(value);
  return parsed.length > 0 ? parsed : WEEKDAY_OPTIONS.map((d) => d.value);
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
  return days.map((d) => LABELS[d]).join(", ");
}
