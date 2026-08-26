import { useEffect, useRef } from "react";
import {
  NOTIFICATION_EVENT,
  TASK_CHANGE_EVENT,
  type TaskChangeDetail,
} from "../constants/events";
import { resolveTaskChatPollMs } from "./useTaskChatLiveSync";

const REFETCH_DEBOUNCE_MS = 250;

export function shouldRefreshDirectChat(
  detail: TaskChangeDetail | undefined,
  conversationId: string | null,
): boolean {
  if (!detail) return true;
  if (detail.type === "sse_connected") return false;
  if (detail.conversation_id && conversationId && detail.conversation_id !== conversationId) {
    return false;
  }
  if (detail.conversation_id && conversationId && detail.conversation_id === conversationId) {
    return true;
  }
  return detail.type === "direct_message" || detail.kind === "direct_message";
}

export function useDirectChatLiveSync(
  conversationId: string | null,
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
      if (!shouldRefreshDirectChat(detail, conversationId)) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => onRefreshRef.current(), REFETCH_DEBOUNCE_MS);
    };
    window.addEventListener(TASK_CHANGE_EVENT, schedule);
    window.addEventListener(NOTIFICATION_EVENT, schedule);
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    if (pollMs > 0) {
      pollTimer = setInterval(() => onRefreshRef.current(), pollMs);
    }
    return () => {
      if (timer) clearTimeout(timer);
      if (pollTimer) clearInterval(pollTimer);
      window.removeEventListener(TASK_CHANGE_EVENT, schedule);
      window.removeEventListener(NOTIFICATION_EVENT, schedule);
    };
  }, [conversationId, pollMs]);
}
