import type { OpsCategory, TaskRecurrence, TaskTemplate } from "../services/taskService";
import { he } from "../i18n/he";

const WEEKDAY_LABELS: Record<string, string> = {
  "0": he.weekdayMon,
  "1": he.weekdayTue,
  "2": he.weekdayWed,
  "3": he.weekdayThu,
  "4": he.weekdayFri,
  "5": he.weekdaySat,
  "6": he.weekdaySun,
};

export type FixedTemplateFilter = "all" | "active" | "inactive";

export function filterFixedTemplates(
  templates: TaskTemplate[],
  filter: FixedTemplateFilter,
): TaskTemplate[] {
  const fixed = templates.filter((t) => t.task_kind === "fixed");
  if (filter === "active") return fixed.filter((t) => t.is_active);
  if (filter === "inactive") return fixed.filter((t) => !t.is_active);
  return fixed;
}

export function sortFixedTemplates(templates: TaskTemplate[]): TaskTemplate[] {
  return [...templates].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    return a.title.localeCompare(b.title, "he");
  });
}

export function formatTemplateSchedule(template: TaskTemplate): string {
  const recurrence = he.recurrenceLabels[template.recurrence as TaskRecurrence] ?? template.recurrence;
  const time = template.due_time || "—";
  if (template.recurrence === "weekly" || template.recurrence === "biweekly") {
    const day = WEEKDAY_LABELS[String(template.weekly_days ?? "")] ?? "";
    return day ? `${recurrence} · ${day} · ${time}` : `${recurrence} · ${time}`;
  }
  if (template.recurrence === "monthly" && template.monthly_day) {
    return `${recurrence} · ${he.monthlyDay} ${template.monthly_day} · ${time}`;
  }
  return `${recurrence} · ${time}`;
}

export function opsCategoryLabel(category: OpsCategory | null | undefined): string {
  if (!category) return he.opsCategoryNone;
  return he.opsCategoryLabels[category] ?? category;
}
