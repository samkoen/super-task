import type { TaskQueues, TimelineTask } from "../services/dashboardService";

/** Priorité haute (cadre rouge/orange) — questions / ממתין לתגובה (phase chat). */
export type ActionQueueReason = "awaiting_response" | "pending_review";

export interface ActionQueueItem {
  task: TimelineTask;
  reason: ActionQueueReason;
}

export interface PendingTaskFilters {
  department: string | null;
  assignee: string | null;
}

export function isFilterAll(value: string | null): boolean {
  return !value;
}

/**
 * File Action Required : d'abord ממתין לתגובה, puis pending_review.
 * Le chat n'est pas encore livré → awaiting_response vide pour l'instant.
 */
export function buildActionQueue(queues: TaskQueues | null | undefined): ActionQueueItem[] {
  if (!queues) return [];

  const awaiting = (queues.pending_review ?? [])
    .filter((t) => t.status === "awaiting_response" || t.segment === "awaiting_response")
    .map((task) => ({ task, reason: "awaiting_response" as const }));

  const reviews = (queues.pending_review ?? [])
    .filter((t) => t.status !== "awaiting_response" && t.segment !== "awaiting_response")
    .sort(
      (a, b) =>
        new Date(b.completed_at ?? b.due_at).getTime() -
        new Date(a.completed_at ?? a.due_at).getTime(),
    )
    .map((task) => ({ task, reason: "pending_review" as const }));

  // Si le statut awaiting_response est un jour dans un autre bucket, on le récupère aussi.
  const fromUpcoming = (queues.upcoming ?? [])
    .filter((t) => t.status === "awaiting_response")
    .map((task) => ({ task, reason: "awaiting_response" as const }));

  const fromInProgress = (queues.in_progress ?? [])
    .filter((t) => t.status === "awaiting_response")
    .map((task) => ({ task, reason: "awaiting_response" as const }));

  return [...awaiting, ...fromUpcoming, ...fromInProgress, ...reviews];
}

/** Tâches du jour pas encore terminées (hors revue photo / terminées). */
export function buildPendingTasks(queues: TaskQueues | null | undefined): TimelineTask[] {
  if (!queues) return [];
  const open = [...(queues.in_progress ?? []), ...(queues.upcoming ?? [])].filter(
    (t) => t.status !== "awaiting_response",
  );
  return open.sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());
}

export function filterPendingTasks(
  tasks: TimelineTask[],
  filters: PendingTaskFilters,
): TimelineTask[] {
  return tasks.filter((task) => {
    if (!isFilterAll(filters.department)) {
      const dept = task.department_name || "";
      if (dept !== filters.department) return false;
    }
    if (!isFilterAll(filters.assignee)) {
      const name = task.assignee_name || "";
      if (name !== filters.assignee) return false;
    }
    return true;
  });
}

export function uniqueDepartments(tasks: TimelineTask[]): string[] {
  const set = new Set<string>();
  for (const task of tasks) {
    if (task.department_name) set.add(task.department_name);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "he"));
}

export function uniqueAssignees(tasks: TimelineTask[]): string[] {
  const set = new Set<string>();
  for (const task of tasks) {
    if (task.assignee_name) set.add(task.assignee_name);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "he"));
}
