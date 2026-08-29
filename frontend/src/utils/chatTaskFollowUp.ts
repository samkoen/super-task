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

export function datetimeLocalToIso(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
