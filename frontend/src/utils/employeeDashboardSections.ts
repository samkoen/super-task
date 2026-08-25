import { sortMostOverdueFirst } from "./employeeTaskFocus";

const CLOSED = new Set(["completed", "cancelled"]);

export function isDynamicEmployeeTask(task: { task_kind?: string | null }): boolean {
  return task.task_kind === "ad_hoc";
}

export function shouldHighlightEmployeeTask(status: string): boolean {
  return status === "overdue" || status === "awaiting_response";
}

export function collectUniqueTasks<T extends { id: string }>(groups: T[][]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const group of groups) {
    for (const task of group) {
      if (seen.has(task.id)) continue;
      seen.add(task.id);
      out.push(task);
    }
  }
  return out;
}

export function splitEmployeeWorkLists<
  T extends { id: string; task_kind?: string | null; status: string; due_at: string },
>(tasks: T[]): { dynamic: T[]; routine: T[] } {
  const open = tasks.filter((t) => !CLOSED.has(t.status) && t.status !== "pending_review");
  const dynamic: T[] = [];
  const routine: T[] = [];
  for (const task of open) {
    if (isDynamicEmployeeTask(task)) dynamic.push(task);
    else routine.push(task);
  }
  return {
    dynamic: sortMostOverdueFirst(dynamic),
    routine: sortMostOverdueFirst(routine),
  };
}
