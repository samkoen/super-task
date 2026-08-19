import { he } from "../i18n/he";
import type { TaskStatus } from "../services/taskService";

const STARTABLE: ReadonlySet<string> = new Set(["pending", "overdue"]);
const DOABLE: ReadonlySet<string> = new Set(["pending", "overdue", "in_progress"]);

export function needsTaskStart(status: TaskStatus | string): boolean {
  return STARTABLE.has(status);
}

export function canDoTask(status: TaskStatus | string): boolean {
  return DOABLE.has(status);
}

export function doTaskButtonLabel(status: TaskStatus | string): string {
  return status === "in_progress" ? he.markDone : he.doTask;
}

export function cardAfterStart<T extends { status: string; started_at?: string | null }>(
  task: T,
  occurrence?: { status?: string; started_at?: string | null } | null,
): T {
  return {
    ...task,
    status: occurrence?.status ?? "in_progress",
    started_at: occurrence?.started_at ?? new Date().toISOString(),
  };
}

export function applyStartedOnDashboard<
  T extends { id: string },
  D extends {
    on_shift?: boolean;
    urgent_tasks: T[];
    today_tasks: T[];
    in_progress_tasks: T[];
  },
>(prev: D | null, taskId: string, updated: T): D | null {
  if (!prev) return prev;
  const without = (list: T[]) => list.filter((t) => t.id !== taskId);
  return {
    ...prev,
    on_shift: true,
    urgent_tasks: without(prev.urgent_tasks),
    today_tasks: without(prev.today_tasks),
    in_progress_tasks: [...without(prev.in_progress_tasks), updated],
  };
}
