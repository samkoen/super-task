import { he } from "../i18n/he";
import type { TaskStatus } from "../services/taskService";
import { normalizeStartUrl } from "./startUrl";

const STARTABLE: ReadonlySet<string> = new Set(["pending", "overdue"]);
const DOABLE: ReadonlySet<string> = new Set(["pending", "overdue", "in_progress"]);

export function needsTaskStart(status: TaskStatus | string): boolean {
  return STARTABLE.has(status);
}

export function hasExternalStartUrl(startUrl: string | null | undefined): boolean {
  return Boolean(normalizeStartUrl(startUrl));
}

export function shouldOpenStartUrlOnBegin(
  status: TaskStatus | string,
  startUrl: string | null | undefined,
): boolean {
  return needsTaskStart(status) && hasExternalStartUrl(startUrl);
}

/** Premier tap avec URL : start + navigateur, même sans cases de clôture.
 *  Le start en vol n'interdit plus le bouton : handleSubmit attend le POST. */
export function canSubmitEmployeeTask(
  status: TaskStatus | string,
  startUrl: string | null | undefined,
  slotsFilled: boolean,
  _startConfirmed = true,
): boolean {
  if (needsTaskStart(status) && hasExternalStartUrl(startUrl)) return true;
  return slotsFilled;
}

/** Premier tap lié : ouvrir le lien seulement si les cases ne sont pas prêtes. */
export function shouldStopAfterOpeningStartUrl(openedLink: boolean, slotsFilled: boolean): boolean {
  return openedLink && !slotsFilled;
}

export function requireLinkedStart<T>(started: T | null): T {
  if (!started) {
    throw new Error(he.taskStartNeedRetry);
  }
  return started;
}

export function isAlreadyStartedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return message.includes("ניתן להתחיל רק משימה");
}

export async function startIgnoringIfAlreadyStarted<
  T extends { status: string; started_at?: string | null },
>(
  task: T,
  start: () => Promise<{ occurrence?: { status?: string; started_at?: string | null } | null }>,
): Promise<T> {
  try {
    const result = await start();
    return cardAfterStart(task, result.occurrence);
  } catch (error) {
    if (isAlreadyStartedError(error)) return cardAfterStart(task);
    throw error;
  }
}

export async function resolveTaskForComplete<
  T extends { id: string; status: string; start_url?: string | null; started_at?: string | null },
>(
  task: T,
  opts: {
    openLink: boolean;
    slotsFilled: boolean;
    start: () => Promise<{ occurrence?: { status?: string; started_at?: string | null } | null }>;
  },
): Promise<{ task: T; deferComplete: boolean }> {
  const next = await startIgnoringIfAlreadyStarted(task, opts.start);
  return {
    task: next,
    deferComplete: shouldStopAfterOpeningStartUrl(opts.openLink, opts.slotsFilled),
  };
}

export function isCompleteBlockedUntilStart(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return message.includes("יש להתחיל את המשימה");
}

export async function completeAfterEnsuringStart(
  complete: () => Promise<void>,
  start: () => Promise<void>,
): Promise<void> {
  try {
    await complete();
  } catch (error) {
    if (!isCompleteBlockedUntilStart(error)) throw error;
    await start();
    await complete();
  }
}

/** Clôture auto après confirmation des cases (flèches), pas au déclencheur photo. */
export function shouldAutoCompleteEmployeeTask(
  requirementCount: number,
  slotsFilled: boolean,
  status: TaskStatus | string,
  startUrl: string | null | undefined,
  startConfirmed = true,
): boolean {
  if (requirementCount < 1 || !slotsFilled) return false;
  if (needsTaskStart(status) && hasExternalStartUrl(startUrl)) return false;
  if (hasExternalStartUrl(startUrl) && !startConfirmed) return false;
  return true;
}

export function employeeSubmitLocked(saving: boolean, annotating: boolean): boolean {
  return saving || annotating;
}

export function canDoTask(status: TaskStatus | string): boolean {
  return DOABLE.has(status);
}

export function doTaskButtonLabel(status: TaskStatus | string): string {
  return status === "in_progress" ? he.markDone : he.doTask;
}

export function cardAfterStart<T extends { status: string; started_at?: string | null }>(
  task: T,
  occurrence?: { status?: string; started_at?: string | null } | null,
): T {
  return {
    ...task,
    status: occurrence?.status ?? "in_progress",
    started_at: occurrence?.started_at ?? new Date().toISOString(),
  };
}

/** Attend le start serveur d'une tâche liée avant complete(); null si le start a échoué. */
export async function waitForInFlightLinkedStart<
  T extends { id: string; status: string; start_url?: string | null },
>(task: T, inFlight: Promise<boolean> | null, inFlightTaskId: string | null): Promise<T | null> {
  if (needsTaskStart(task.status) || !hasExternalStartUrl(task.start_url)) {
    return task;
  }
  if (!inFlight || inFlightTaskId !== task.id) {
    return task;
  }
  const started = await inFlight;
  if (!started) return null;
  return cardAfterStart(task);
}

export function applyStartedOnDashboard<
  T extends { id: string },
  D extends {
    on_shift?: boolean;
    urgent_tasks: T[];
    today_tasks: T[];
    in_progress_tasks: T[];
  },
>(prev: D | null, taskId: string, updated: T): D | null {
  if (!prev) return prev;
  const without = (list: T[]) => list.filter((t) => t.id !== taskId);
  return {
    ...prev,
    on_shift: true,
    urgent_tasks: without(prev.urgent_tasks),
    today_tasks: without(prev.today_tasks),
    in_progress_tasks: [...without(prev.in_progress_tasks), updated],
  };
}

function withoutTask<T extends { id: string }>(list: T[], taskId: string): T[] {
  return list.filter((t) => t.id !== taskId);
}

function putTask<T extends { id: string }>(list: T[], task: T): T[] {
  return [...withoutTask(list, task.id), task];
}

function restoreToUrgent(task: { status?: string; task_kind?: string }): boolean {
  return task.status === "overdue" || task.task_kind === "ad_hoc";
}

export function revertStartedOnDashboard<
  T extends { id: string; status?: string; task_kind?: string },
  D extends {
    urgent_tasks: T[];
    today_tasks: T[];
    in_progress_tasks: T[];
  },
>(prev: D | null, original: T): D | null {
  if (!prev) return prev;
  return {
    ...prev,
    in_progress_tasks: withoutTask(prev.in_progress_tasks, original.id),
    today_tasks: putTask(prev.today_tasks, original),
    urgent_tasks: restoreToUrgent(original)
      ? putTask(prev.urgent_tasks, original)
      : withoutTask(prev.urgent_tasks, original.id),
  };
}
