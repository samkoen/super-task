const PUNCH_DONE = new Set(["completed", "pending_review", "cancelled"]);

export type PunchKind = "start" | "end";

export type PunchTask = {
  id: string;
  status: string;
  due_at: string;
  is_work_start?: boolean;
  is_work_end?: boolean;
};

/** Tâches finies sur ce téléphone dont les fichiers attendent encore la קליטה. */
export type HandedOverIds = ReadonlySet<string>;

const NONE: HandedOverIds = new Set();

/**
 * Encore à faire pour l'oved : ni envoyée, ni finie sans réseau avec ses fichiers en file sur ce téléphone.
 * Sinon, après un envoi hors ligne, la porte de כניסה revenait et redemandait de filmer.
 */
export function isOpenForEmployee(task: Pick<PunchTask, "id" | "status">, handedOver: HandedOverIds = NONE): boolean {
  return isOpenPunchStatus(task.status) && !handedOver.has(task.id);
}

export function isOpenPunchStatus(status: string): boolean {
  return !PUNCH_DONE.has(status);
}

export function isAttendancePunchTask(task: {
  is_work_start?: boolean;
  is_work_end?: boolean;
}): boolean {
  return Boolean(task.is_work_start || task.is_work_end);
}

export function excludeAttendancePunch<T extends { is_work_start?: boolean; is_work_end?: boolean }>(
  tasks: T[],
): T[] {
  return tasks.filter((task) => !isAttendancePunchTask(task));
}

export function isPunchDue(dueAt: string | null | undefined, now: Date): boolean {
  if (!dueAt) return false;
  const ms = new Date(dueAt).getTime();
  return Number.isFinite(ms) && ms <= now.getTime();
}

export function findOpenPunchTask<T extends PunchTask>(
  tasks: T[],
  kind: PunchKind,
  handedOver: HandedOverIds = NONE,
): T | null {
  const flag = kind === "start" ? "is_work_start" : "is_work_end";
  const open = tasks.filter((task) => Boolean(task[flag]) && isOpenForEmployee(task, handedOver));
  if (!open.length) return null;
  return open.slice().sort((a, b) => a.due_at.localeCompare(b.due_at))[0];
}

export function hasOpenWorkTasks<T extends PunchTask>(tasks: T[], handedOver: HandedOverIds = NONE): boolean {
  return excludeAttendancePunch(tasks).some((task) => isOpenForEmployee(task, handedOver));
}

/** Écran יציאה seulement quand la כניסה est faite et qu'il ne reste plus de tâche. */
export function shouldShowEndDoor(opts: {
  startOpen: boolean;
  end: PunchTask | null;
  inTask: boolean;
  hasOpenWork: boolean;
}): boolean {
  if (opts.startOpen || !opts.end || opts.inTask || opts.hasOpenWork) return false;
  return true;
}
