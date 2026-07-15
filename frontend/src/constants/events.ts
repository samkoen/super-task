/** Dispatched when the backend pushes a task SSE event. */
export const TASK_CHANGE_EVENT = "super:task-change";

/** Dispatched when a persisted notification arrives over SSE. */
export const NOTIFICATION_EVENT = "super:notification";

export interface TaskChangeDetail {
  type?: string;
  branch_id?: string;
  assignee_user_id?: string;
  occurrence_id?: string;
  status?: string;
  kind?: string;
}
