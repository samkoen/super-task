import type { TaskStatus } from "../services/taskService";

/** Statuts où l’oved peut envoyer un message (miroir backend domain/task_chat). */
const EMPLOYEE_COMPOSE: ReadonlySet<TaskStatus> = new Set([
  "in_progress",
  "overdue",
  "awaiting_response",
]);

/** Statuts où le menahel peut envoyer un message. */
const MANAGER_COMPOSE: ReadonlySet<TaskStatus> = new Set([
  "in_progress",
  "overdue",
  "awaiting_response",
  "pending_review",
]);

export function canComposeTaskChat(status: TaskStatus, isEmployee: boolean): boolean {
  return (isEmployee ? EMPLOYEE_COMPOSE : MANAGER_COMPOSE).has(status);
}
