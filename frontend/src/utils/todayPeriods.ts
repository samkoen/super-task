/**
 * Moments de la journée (Figma « Period Header » : בוקר / צהריים / ערב). Source unique des seuils
 * (12 h, 17 h) pour tout l'app : écran oved, salutation, écrans menahel.
 */
export type TodayPeriod = "morning" | "noon" | "evening";

export const TODAY_PERIODS: TodayPeriod[] = ["morning", "noon", "evening"];

interface PeriodTask {
  id: string;
  due_at: string;
  status: string;
}

export interface TodayPeriodGroup<T> {
  period: TodayPeriod;
  tasks: T[];
}

/** Envoyée par l'oved (en attente d'ichour comprise) : ligne « Done » avec la case verte. */
export function isTodayTaskDone(status: string): boolean {
  return status === "completed" || status === "pending_review";
}

function dueMs(task: PeriodTask): number {
  const ms = new Date(task.due_at).getTime();
  return Number.isNaN(ms) ? Number.MAX_SAFE_INTEGER : ms;
}

export const NOON_STARTS_AT = 12;
export const EVENING_STARTS_AT = 17;

export function periodForHour(hour: number): TodayPeriod {
  if (hour < NOON_STARTS_AT) return "morning";
  if (hour < EVENING_STARTS_AT) return "noon";
  return "evening";
}

/** Heure illisible : la tâche reste visible, dans la première période. */
export function periodForDue(dueAt: string): TodayPeriod {
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return "morning";
  return periodForHour(date.getHours());
}

/** Périodes non vides, dans l'ordre de la journée ; tâches triées par heure dans chaque période. */
export function groupTodayTasks<T extends PeriodTask>(tasks: T[]): TodayPeriodGroup<T>[] {
  const buckets = new Map<TodayPeriod, T[]>(TODAY_PERIODS.map((period) => [period, []]));
  for (const task of tasks) {
    if (task.status === "cancelled") continue;
    buckets.get(periodForDue(task.due_at))?.push(task);
  }
  return TODAY_PERIODS.map((period) => ({
    period,
    tasks: [...(buckets.get(period) ?? [])].sort((a, b) => dueMs(a) - dueMs(b)),
  })).filter((group) => group.tasks.length > 0);
}
