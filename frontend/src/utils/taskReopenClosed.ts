import type { TaskOccurrence } from "../services/taskService";

export function canReopenClosedTask(
  task: Pick<TaskOccurrence, "status" | "completion"> | null | undefined,
): boolean {
  if (!task || task.status !== "completed") return false;
  return task.completion?.manager_review_status === "approved";
}
