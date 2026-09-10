import { he } from "../i18n/he";
import type { CompleteTaskPayload, CompletionAttachment, CompletionStatus } from "../services/taskService";

export const NOT_COMPLETED_REASON_MAX = 500;

export function isTaskNotCompleted(
  status: CompletionStatus | string | null | undefined,
): boolean {
  return status === "not_completed";
}

export function completionOutcomeLabel(
  status: CompletionStatus | string | null | undefined,
): string {
  return isTaskNotCompleted(status) ? he.taskNotCompleted : he.taskCompleted;
}

export function incompleteReasonError(reason: string): string {
  const text = reason.trim();
  if (!text) return he.incompleteTaskReasonRequired;
  if (text.length > NOT_COMPLETED_REASON_MAX) return he.incompleteTaskReasonTooLong;
  return "";
}

export function shouldPromptIncomplete(
  slotsFilled: boolean,
  deferComplete: boolean,
): boolean {
  return !slotsFilled && !deferComplete;
}

export function employeeCompletePayload(input: {
  slotsFilled: boolean;
  note: string;
  attachments: CompletionAttachment[];
  incompleteReason?: string;
}): CompleteTaskPayload {
  const note = input.note.trim() || undefined;
  const attachments = input.attachments.length ? input.attachments : undefined;
  if (input.slotsFilled) {
    return { status: "completed", note, completion_attachments: attachments };
  }
  return {
    status: "not_completed",
    note,
    not_completed_reason: input.incompleteReason?.trim(),
    completion_attachments: attachments,
  };
}
