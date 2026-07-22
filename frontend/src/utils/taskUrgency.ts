import type { TaskStatus } from "../services/taskService";

export type TaskUrgencyLevel = "overdue" | "soon" | "normal" | "done";

const SOON_MS = 24 * 60 * 60 * 1000;

/** Niveau d'urgence affiché sur la carte (dérivé du statut + échéance). */
export function taskUrgencyLevel(
  status: TaskStatus,
  dueAt: string,
  nowMs: number = Date.now(),
): TaskUrgencyLevel {
  if (status === "completed" || status === "cancelled") return "done";
  if (status === "overdue") return "overdue";
  const due = new Date(dueAt).getTime();
  if (Number.isNaN(due)) return "normal";
  if (due < nowMs) return "overdue";
  if (due - nowMs <= SOON_MS) return "soon";
  return "normal";
}
