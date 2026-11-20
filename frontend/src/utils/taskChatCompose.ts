import type { TaskStatus } from "../services/taskService";

/**
 * Statuts où l’oved peut envoyer un message (miroir backend domain/task_chat).
 * « ממתין לאישור » compris : la tâche y reste, le menahel garde sa revue.
 */
const EMPLOYEE_COMPOSE: ReadonlySet<TaskStatus> = new Set([
  "pending",
  "in_progress",
  "overdue",
  "awaiting_response",
  "pending_review",
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

/** Review / fermée : chat en haut, comme l’ouverture « en attente ». */
export function employeeOpensTaskChatFirst(status: TaskStatus): boolean {
  return status === "pending_review" || status === "completed";
}
