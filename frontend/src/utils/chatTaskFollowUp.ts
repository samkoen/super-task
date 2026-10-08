import type { TimelineTask } from "../services/dashboardService";
import type { TaskStatus } from "../services/taskService";

export function followUpIsPending(followUpAt: string | null | undefined, nowMs: number): boolean {
  if (!followUpAt) return false;
  const at = new Date(followUpAt).getTime();
  return Number.isFinite(at) && at > nowMs;
}

export function isOpenChatTask(
  status: TaskStatus | string | undefined,
  resolvedAt?: string | null,
): boolean {
  return status === "awaiting_response" && !resolvedAt;
}

export function isContinuousChatTask(
  task: Pick<TimelineTask, "status" | "segment" | "chat_follow_up_at" | "chat_resolved_at">,
  nowMs = Date.now(),
): boolean {
  const awaiting = task.status === "awaiting_response" || task.segment === "awaiting_response";
  if (!awaiting || task.chat_resolved_at) return false;
  return !followUpIsPending(task.chat_follow_up_at, nowMs);
}

/** File menahel : message d'oved non lu, ou rappel מעקב arrivé à échéance. */
export function chatNeedsManagerAttention(
  task: Pick<TimelineTask, "status" | "segment" | "chat_follow_up_at" | "chat_resolved_at"> & {
    chat_unread_count?: number | null;
  },
  nowMs = Date.now(),
): boolean {
  if (!isContinuousChatTask(task, nowMs)) return false;
  const unread = task.chat_unread_count;
  if (unread == null) return true;
  if (unread > 0) return true;
  return Boolean(task.chat_follow_up_at);
}

export function isPendingFollowUpTask(
  task: Pick<TimelineTask, "status" | "chat_follow_up_at" | "chat_resolved_at">,
  nowMs = Date.now(),
): boolean {
  if (!isOpenChatTask(task.status, task.chat_resolved_at)) return false;
  return followUpIsPending(task.chat_follow_up_at, nowMs);
}

export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export type FollowUpPreset = { key: "hour" | "tomorrow" | "week"; value: string };

/** Choix rapides de rappel (valeurs `datetime-local`) : dans une heure, demain 9h, dans 7 jours 9h. */
export function followUpPresets(now: Date): FollowUpPreset[] {
  const inHour = new Date(now.getTime() + 60 * 60 * 1000);
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0);
  const nextWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 9, 0);
  return [
    { key: "hour", value: toDatetimeLocalValue(inHour.toISOString()) },
    { key: "tomorrow", value: toDatetimeLocalValue(tomorrow.toISOString()) },
    { key: "week", value: toDatetimeLocalValue(nextWeek.toISOString()) },
  ];
}

/** Rappel lisible (« יום ה׳, 9 באוק׳ · 09:00 »), ou chaîne vide si la valeur est invalide. */
export function formatFollowUpPreview(value: string): string {
  const iso = datetimeLocalToIso(value);
  if (!iso) return "";
  const d = new Date(iso);
  const day = d.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" });
  const time = d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  return `${day} · ${time}`;
}

export function datetimeLocalToIso(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
