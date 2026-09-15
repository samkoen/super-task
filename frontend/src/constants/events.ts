/** Dispatched when the backend pushes a task SSE event. */
export const TASK_CHANGE_EVENT = "super:task-change";

/** Dispatched when a persisted notification arrives over SSE. */
export const NOTIFICATION_EVENT = "super:notification";

/** User-initiated pull-to-refresh (pages + notification bell). */
export const MANUAL_REFRESH_TYPE = "manual_refresh";

/** Dispatched when the oved starts or ends a pause (הפסקה). */
export const BREAK_CHANGE_EVENT = "super:break-change";

export interface TaskChangeDetail {
  type?: string;
  branch_id?: string;
  assignee_user_id?: string;
  occurrence_id?: string;
  conversation_id?: string;
  status?: string;
  kind?: string;
  sound?: string;
  notification_id?: string;
}

export function dispatchManualLiveRefresh(): void {
  const detail: TaskChangeDetail = { type: MANUAL_REFRESH_TYPE };
  window.dispatchEvent(new CustomEvent(TASK_CHANGE_EVENT, { detail }));
  window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT, { detail }));
}
