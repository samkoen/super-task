/** Onglet « משימות › היום » (Figma « Menahel · משימות ») : tâches du jour par moment de la journée. */
import { he } from "../i18n/he";
import type { TaskOccurrence } from "../services/taskService";
import { formatHebrewDayNoYear, shiftDay, todayIso } from "./dateView";
import { formatClockTime } from "./flowReview";
import { DAY_PERIODS, periodOf, type DayPeriod } from "./managerHome";

export type TaskRowState = "done" | "review" | "active" | "late" | "todo";

/**
 * Une preuve envoyée compte comme faite pour l'oved (elle attend seulement le menahel).
 * Même chose pour une tâche finie sans קליטה : l'oved a fini, seuls les fichiers manquent encore.
 */
export function taskRowState(task: Pick<TaskOccurrence, "status" | "awaiting_upload_at">): TaskRowState {
  if (awaitsUpload(task)) return "review";
  switch (task.status) {
    case "completed": return "done";
    case "pending_review": return "review";
    case "in_progress":
    case "awaiting_response": return "active";
    case "overdue": return "late";
    default: return "todo";
  }
}

export function isRowChecked(state: TaskRowState): boolean {
  return state === "done" || state === "review";
}

export type PeriodGroup = { period: DayPeriod; tasks: TaskOccurrence[]; done: number; total: number };

/** Trois blocs (בוקר, צהריים, ערב) dans l'ordre de la journée ; les blocs vides ne sont pas affichés. */
export function groupTasksByPeriod(tasks: TaskOccurrence[]): PeriodGroup[] {
  const visible = tasks.filter((task) => task.status !== "cancelled");
  const sorted = [...visible].sort((a, b) => a.due_at.localeCompare(b.due_at));
  return DAY_PERIODS.map((period) => {
    const inPeriod = sorted.filter((task) => periodOf(task.due_at) === period);
    const done = inPeriod.filter((task) => isRowChecked(taskRowState(task))).length;
    return { period, tasks: inPeriod, done, total: inPeriod.length };
  }).filter((group) => group.total > 0);
}

/** Oved sans קליטה : « ממתין להעלאה · 10:42 » (heure de fin sur son téléphone) tant que les fichiers ne sont pas arrivés. */
function awaitsUpload(task: Pick<TaskOccurrence, "status" | "awaiting_upload_at">): boolean {
  return Boolean(task.awaiting_upload_at) && !["pending_review", "completed", "cancelled"].includes(task.status);
}

export function awaitingUploadLabel(task: Pick<TaskOccurrence, "status" | "awaiting_upload_at">): string | null {
  if (!awaitsUpload(task) || !task.awaiting_upload_at) return null;
  const time = formatClockTime(task.awaiting_upload_at);
  return time ? he.managerTaskAwaitingUpload(time) : null;
}

/** « דני · ממתין לאישור » (+ « · 15 דק׳ » si la durée est prévue) ; « לא משויך » quand personne n'est désigné. */
export function taskRowSubtitle(task: TaskOccurrence): string {
  const who = task.assignee_name?.trim() || he.managerTasksUnassigned;
  const waiting = awaitingUploadLabel(task);
  const parts = [who, waiting ?? he.taskStatusLabels[task.status]];
  if (task.duration_minutes) parts.push(he.todayTaskMinutes(task.duration_minutes));
  return parts.join(" · ");
}

/** Heure de la ligne ; la date est ajoutée quand la tâche n'est pas du jour affiché (vue sur plusieurs jours). */
export function taskRowTime(dueAt: string, shownDay: string): string {
  const date = new Date(dueAt);
  const pad = (value: number) => String(value).padStart(2, "0");
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const iso = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return iso === shownDay ? time : `${pad(date.getDate())}.${pad(date.getMonth() + 1)} ${time}`;
}

/** « היום », « אתמול », « מחר », sinon le jour en toutes lettres. */
export function dayNavLabel(iso: string, today = todayIso()): string {
  if (iso === today) return he.managerTasksToday;
  if (iso === shiftDay(today, -1)) return he.managerTasksYesterday;
  if (iso === shiftDay(today, 1)) return he.managerTasksTomorrow;
  return formatHebrewDayNoYear(iso);
}

/** Preuves à valider de la liste affichée, dans l'ordre de la journée (file de la revue plein écran). */
export function reviewQueueFromTasks(tasks: TaskOccurrence[]): { id: string; title: string }[] {
  return [...tasks]
    .filter((task) => task.status === "pending_review")
    .sort((a, b) => a.due_at.localeCompare(b.due_at))
    .map((task) => ({ id: task.id, title: task.title }));
}
