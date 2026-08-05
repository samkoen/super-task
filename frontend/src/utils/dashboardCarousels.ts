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

/** שורה 1 SPEC — שאלות עובדים בלבד (ממתין לתגובה). */
export function buildQuestionsQueue(queues: TaskQueues | null | undefined): ActionQueueItem[] {
  if (!queues) return [];
  const fromReview = (queues.pending_review ?? []).filter(
    (t) => t.status === "awaiting_response" || t.segment === "awaiting_response",
  );
  const fromUpcoming = (queues.upcoming ?? []).filter((t) => t.status === "awaiting_response");
  const fromInProgress = (queues.in_progress ?? []).filter((t) => t.status === "awaiting_response");
  const seen = new Set<string>();
  const out: ActionQueueItem[] = [];
  for (const task of [...fromReview, ...fromUpcoming, ...fromInProgress]) {
    if (seen.has(task.id)) continue;
    seen.add(task.id);
    out.push({ task, reason: "awaiting_response" });
  }
  return out;
}

/** שורה 3 SPEC — משימות שבוצעו וממתינות לאישור מנהל. */
export function buildPendingReviewQueue(queues: TaskQueues | null | undefined): ActionQueueItem[] {
  if (!queues) return [];
  return (queues.pending_review ?? [])
    .filter((t) => t.status !== "awaiting_response" && t.segment !== "awaiting_response")
    .sort(
      (a, b) =>
        new Date(b.completed_at ?? b.due_at).getTime() -
        new Date(a.completed_at ?? a.due_at).getTime(),
    )
    .map((task) => ({ task, reason: "pending_review" as const }));
}

/**
 * File Action Required (legacy) : questions puis pending_review.
 * Préférer buildQuestionsQueue / buildPendingReviewQueue pour le layout 3 rangées.
 */
export function buildActionQueue(queues: TaskQueues | null | undefined): ActionQueueItem[] {
  return [...buildQuestionsQueue(queues), ...buildPendingReviewQueue(queues)];
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
