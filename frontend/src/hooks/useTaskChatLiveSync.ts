import { useEffect, useRef } from "react";
import {
  NOTIFICATION_EVENT,
  TASK_CHANGE_EVENT,
  type TaskChangeDetail,
} from "../constants/events";

/** Poll de secours chat (APK sans SSE / Vercel multi-instance). */
export const DEFAULT_TASK_CHAT_POLL_MS = 10_000;

const REFETCH_DEBOUNCE_MS = 250;

/** `false` = pas de poll ; sinon ms (défaut 10s, ou `VITE_TASK_CHAT_POLL_MS`). */
export function resolveTaskChatPollMs(override?: number | false): number {
  if (override === false) return 0;
  if (typeof override === "number" && Number.isFinite(override) && override >= 0) {
    return override;
  }
  const raw = import.meta.env.VITE_TASK_CHAT_POLL_MS;
  if (raw !== undefined && String(raw).trim() !== "") {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return DEFAULT_TASK_CHAT_POLL_MS;
}

export function shouldRefreshTaskChat(
  detail: TaskChangeDetail | undefined,
  occurrenceId: string,
): boolean {
  if (!detail) return true;
  if (detail.type === "sse_connected") return false;
  if (detail.occurrence_id && detail.occurrence_id !== occurrenceId) return false;
  if (detail.occurrence_id === occurrenceId) return true;
  const chatKind =
    Boolean(detail.type?.startsWith("task_message")) ||
    Boolean(detail.kind?.startsWith("task_message"));
  return chatKind;
}

/**
 * Sync live du fil chat : SSE (task + notif message) + poll de secours.
 * Le poll tourne aussi sur APK (SSE désactivé).
 */
export function useTaskChatLiveSync(
  occurrenceId: string,
  onRefresh: () => void,
  options?: { pollMs?: number | false },
) {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;
  const pollMs = resolveTaskChatPollMs(options?.pollMs);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = (ev?: Event) => {
      const detail = (ev as CustomEvent<TaskChangeDetail> | undefined)?.detail;
      if (!shouldRefreshTaskChat(detail, occurrenceId)) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => onRefreshRef.current(), REFETCH_DEBOUNCE_MS);
    };

    window.addEventListener(TASK_CHANGE_EVENT, schedule);
    window.addEventListener(NOTIFICATION_EVENT, schedule);

    let pollTimer: ReturnType<typeof setInterval> | undefined;
    if (pollMs > 0) {
      pollTimer = setInterval(() => {
        onRefreshRef.current();
      }, pollMs);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (pollTimer) clearInterval(pollTimer);
      window.removeEventListener(TASK_CHANGE_EVENT, schedule);
      window.removeEventListener(NOTIFICATION_EVENT, schedule);
    };
  }, [occurrenceId, pollMs]);
}
