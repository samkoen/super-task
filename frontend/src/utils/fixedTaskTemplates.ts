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

export function defaultApplyEditToNetwork(
  template: Pick<TaskTemplate, "network_group_id" | "is_network_task"> & { id?: string },
  canPickBranch: boolean,
  networkIds?: Set<string>,
): boolean {
  return Boolean(canPickBranch && isNetworkFixedTemplate(template, networkIds));
}

export function isNetworkFixedTemplate(
  template: Pick<TaskTemplate, "network_group_id" | "is_network_task"> & { id?: string },
  networkIds?: Set<string>,
): boolean {
  if (template.network_group_id || template.is_network_task) return true;
  return Boolean(template.id && networkIds?.has(template.id));
}

export function networkFixedTemplateIds(templates: TaskTemplate[]): Set<string> {
  const ids = new Set<string>();
  const byKey = new Map<string, TaskTemplate[]>();
  for (const t of templates) {
    if (t.network_group_id || t.is_network_task) ids.add(t.id);
    const key = templateContentKey(t);
    const list = byKey.get(key) ?? [];
    list.push(t);
    byKey.set(key, list);
  }
  for (const list of byKey.values()) {
    if (new Set(list.map((row) => row.branch_id)).size >= 2) {
      list.forEach((row) => ids.add(row.id));
    }
  }
  return ids;
}

function templateContentKey(t: TaskTemplate): string {
  return [t.title, t.recurrence, t.due_time, t.weekly_days ?? "", t.monthly_day ?? ""].join("\0");
}

export function networkGroupSize(tpl: TaskTemplate, templates: TaskTemplate[]): number {
  if (tpl.network_group_id) {
    return new Set(
      templates
        .filter((t) => t.network_group_id === tpl.network_group_id)
        .map((t) => t.branch_id),
    ).size;
  }
  const key = templateContentKey(tpl);
  return new Set(
    templates.filter((t) => templateContentKey(t) === key).map((t) => t.branch_id),
  ).size;
}

export function networkFixedChipLabel(
  tpl: TaskTemplate,
  templates: TaskTemplate[],
  allBranchCount: number,
): string {
  const n = networkGroupSize(tpl, templates);
  if (allBranchCount > 0 && n >= allBranchCount) return he.fixedTaskNetworkChip;
  if (n >= 2) return he.fixedTaskNetworkChipCount(n);
  return he.fixedTaskNetworkChip;
}
