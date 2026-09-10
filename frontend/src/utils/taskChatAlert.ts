import { shouldDeliverEmployeeAlert } from "./employeeBreakMute";

export const TASK_CHAT_ALERT_KINDS = new Set([
  "task_message_employee",
  "task_message_manager",
]);

/** Kinds that must refetch the oved dashboard (SSE off on the APK). */
export const EMPLOYEE_TASK_SYNC_KINDS = new Set([
  ...TASK_CHAT_ALERT_KINDS,
  "task_reopened",
  "task_approved",
  "task_created",
  "task_delegated",
  "task_cancelled",
  "task_updated",
]);

export function isTaskChatAlertKind(kind: string | undefined): boolean {
  return Boolean(kind && TASK_CHAT_ALERT_KINDS.has(kind));
}

export function isEmployeeTaskSyncKind(kind: string | undefined): boolean {
  return Boolean(kind && EMPLOYEE_TASK_SYNC_KINDS.has(kind));
}

export function shouldShowTaskChatBanner(input: {
  kind: string | undefined;
  onBreak: boolean;
  occurrenceId: string | null | undefined;
  viewingOccurrenceId: string | null;
}): boolean {
  if (!isTaskChatAlertKind(input.kind)) return false;
  if (!shouldDeliverEmployeeAlert(input.onBreak, input.kind)) return false;
  if (input.occurrenceId && input.viewingOccurrenceId === input.occurrenceId) return false;
  return true;
}

export function taskChatAlertPath(
  kind: string,
  role: string | undefined,
  occurrenceId: string,
): string {
  if (kind === "task_message_manager" || role === "employee") {
    return `/employee?task=${encodeURIComponent(occurrenceId)}`;
  }
  return `/manager/tasks?task=${encodeURIComponent(occurrenceId)}`;
}

export function notificationIdToLocalId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
}
