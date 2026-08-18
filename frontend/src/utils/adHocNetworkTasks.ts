import type { TaskOccurrence } from "../services/taskService";
import { he } from "../i18n/he";
import { isNetworkFixedTemplate } from "./fixedTaskTemplates";

export function isNetworkAdHocOccurrence(
  task: Pick<TaskOccurrence, "task_kind" | "network_group_id" | "is_network_task"> & {
    id?: string;
  },
  networkIds?: Set<string>,
): boolean {
  if (task.task_kind !== "ad_hoc") return false;
  return isNetworkFixedTemplate(task, networkIds);
}

export function defaultApplyAdHocEditToNetwork(
  task: Pick<TaskOccurrence, "task_kind" | "network_group_id" | "is_network_task"> & {
    id?: string;
  },
  canPickBranch: boolean,
  networkIds?: Set<string>,
): boolean {
  return Boolean(canPickBranch && isNetworkAdHocOccurrence(task, networkIds));
}

export function networkAdHocIds(tasks: TaskOccurrence[]): Set<string> {
  const ids = new Set<string>();
  const byKey = new Map<string, TaskOccurrence[]>();
  for (const t of tasks) {
    if (t.task_kind !== "ad_hoc") continue;
    if (t.network_group_id || t.is_network_task) ids.add(t.id);
    const key = occurrenceContentKey(t);
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

export function networkAdHocChipLabel(
  task: TaskOccurrence,
  tasks: TaskOccurrence[],
  allBranchCount: number,
): string | null {
  if (!isNetworkAdHocOccurrence(task, networkAdHocIds(tasks))) return null;
  const n = networkAdHocGroupSize(task, tasks);
  if (allBranchCount > 0 && n >= allBranchCount) return he.fixedTaskNetworkChip;
  if (n >= 2) return he.fixedTaskNetworkChipCount(n);
  return he.fixedTaskNetworkChip;
}

function networkAdHocGroupSize(task: TaskOccurrence, tasks: TaskOccurrence[]): number {
  if (task.network_group_id) {
    return new Set(
      tasks
        .filter((t) => t.network_group_id === task.network_group_id)
        .map((t) => t.branch_id),
    ).size;
  }
  const key = occurrenceContentKey(task);
  return new Set(
    tasks.filter((t) => occurrenceContentKey(t) === key).map((t) => t.branch_id),
  ).size;
}

function occurrenceContentKey(t: TaskOccurrence): string {
  return [t.title, t.description ?? "", t.due_at].join("\0");
}
