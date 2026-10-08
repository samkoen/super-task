import { he } from "../i18n/he";
import { sortEmployeeOpenFocus, sortInProgressFocusFirst } from "./employeeTaskFocus";

interface FocusTask {
  id: string;
  status: string;
  due_at: string;
  started_at?: string | null;
  manager_next_at?: string | null;
  is_manager_next?: boolean;
}

export interface WorkLists<T> {
  dynamic: T[];
  routine: T[];
}

const STARTED = new Set(["in_progress", "awaiting_response"]);

/**
 * La seule tâche mise en avant sur l'écran oved :
 * déjà commencée, puis demandée par le menahel, puis la plus en retard.
 */
export function pickNextTask<T extends FocusTask>(lists: WorkLists<T>): T | null {
  const open = [...lists.dynamic, ...lists.routine];
  if (open.length === 0) return null;
  const started = open.filter((task) => STARTED.has(task.status));
  if (started.length > 0) return sortInProgressFocusFirst(started)[0];
  return sortEmployeeOpenFocus(open, false)[0];
}

/** Les listes sans la tâche déjà affichée en grand. */
export function withoutTask<T extends { id: string }>(
  lists: WorkLists<T>,
  taskId: string | null | undefined,
): WorkLists<T> {
  if (!taskId) return lists;
  return {
    dynamic: lists.dynamic.filter((task) => task.id !== taskId),
    routine: lists.routine.filter((task) => task.id !== taskId),
  };
}

export function employeeGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return he.employeeGreetingMorning;
  if (hour >= 12 && hour < 18) return he.employeeGreetingNoon;
  if (hour >= 18 && hour < 22) return he.employeeGreetingEvening;
  return he.employeeGreetingNight;
}

/** Prénom seul : « דני עובד » → « דני » (plus chaleureux et plus court). */
export function employeeFirstName(fullName: string | null | undefined): string {
  return (fullName ?? "").trim().split(/\s+/)[0] ?? "";
}
