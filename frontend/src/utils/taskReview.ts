import { he } from "../i18n/he";
import type { TaskCompletion } from "../services/taskService";

export function reopenNoteError(note: string): string {
  return note.trim() ? "" : he.taskReopenNoteRequired;
}

export function rejectionRemark(
  completion: Pick<TaskCompletion, "manager_review_status" | "rejection_note"> | null | undefined,
): string | null {
  if (completion?.manager_review_status !== "rejected") return null;
  return (completion.rejection_note || "").trim() || he.taskRejectedReopen;
}
