const PUNCH_DONE = new Set(["completed", "pending_review", "cancelled"]);

export type PunchKind = "start" | "end";

export type PunchTask = {
  id: string;
  status: string;
  due_at: string;
  is_work_start?: boolean;
  is_work_end?: boolean;
};

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

export function findOpenPunchTask<T extends PunchTask>(tasks: T[], kind: PunchKind): T | null {
  const flag = kind === "start" ? "is_work_start" : "is_work_end";
  const open = tasks.filter((task) => Boolean(task[flag]) && isOpenPunchStatus(task.status));
  if (!open.length) return null;
  return open.slice().sort((a, b) => a.due_at.localeCompare(b.due_at))[0];
}

export function shouldShowEndDoor(opts: {
  startOpen: boolean;
  end: PunchTask | null;
  inTask: boolean;
  due: boolean;
  requested: boolean;
  dismissed: boolean;
}): boolean {
  if (opts.startOpen || !opts.end || opts.inTask) return false;
  if (opts.requested) return true;
  return opts.due && !opts.dismissed;
}
