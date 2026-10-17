import { formatClockTime } from "./clockTime";
import type { WorkLists } from "./employeeNextTask";

interface TimelineTask {
  id: string;
  due_at: string;
}

export interface TimelineEntry<T> {
  task: T;
  /** Tâche mise en avant (grande carte avec le bouton d'action). */
  isNext: boolean;
  /** מזדמנת : point rouge sur le trait. */
  isDynamic: boolean;
}

function dueMs(task: TimelineTask): number {
  const ms = new Date(task.due_at).getTime();
  return Number.isNaN(ms) ? Number.MAX_SAFE_INTEGER : ms;
}

/** La tâche mise en avant d'abord, puis le reste dans l'ordre des heures. */
export function orderTimelineTasks<T extends TimelineTask>(
  lists: WorkLists<T>,
  next: T | null | undefined,
): TimelineEntry<T>[] {
  const rest: TimelineEntry<T>[] = [
    ...lists.routine.map((task) => ({ task, isNext: false, isDynamic: false })),
    ...lists.dynamic.map((task) => ({ task, isNext: false, isDynamic: true })),
  ]
    .filter((entry) => entry.task.id !== next?.id)
    .sort((a, b) => dueMs(a.task) - dueMs(b.task));
  if (!next) return rest;
  const isDynamic = lists.dynamic.some((task) => task.id === next.id);
  return [{ task: next, isNext: true, isDynamic }, ...rest];
}

/** Heure HH:MM d'une échéance, ou chaîne vide si la date est illisible. */
export function timelineTimeLabel(dueAt: string): string {
  const date = new Date(dueAt);
  return Number.isNaN(date.getTime()) ? "" : formatClockTime(date);
}
