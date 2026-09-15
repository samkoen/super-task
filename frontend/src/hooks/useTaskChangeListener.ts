import { useEffect, useRef } from "react";
import { TASK_CHANGE_EVENT, type TaskChangeDetail } from "../constants/events";

const REFETCH_DEBOUNCE_MS = 300;
export const TASK_LIVE_POLL_MS = 25_000;

/**
 * Refetch handler for pages that display tasks (debounced SSE + resume + poll).
 * Ignore `sse_connected` — reconnect storms must not freeze the list.
 * Poll + visibility also run on the APK (SSE stays off in the WebView).
 */
export function useTaskChangeListener(
  onChange: () => void,
  options?: { pollMs?: number | false },
) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const pollMs = resolveTaskLivePollMs(options?.pollMs);

  useEffect(() => {
    return subscribeTaskLiveRefresh(() => onChangeRef.current(), pollMs);
  }, [pollMs]);
}

export function resolveTaskLivePollMs(override?: number | false): number {
  if (override === false) return 0;
  if (typeof override === "number" && Number.isFinite(override) && override >= 0) {
    return override;
  }
  return TASK_LIVE_POLL_MS;
}

export function shouldIgnoreTaskLiveEvent(detail?: TaskChangeDetail): boolean {
  return detail?.type === "sse_connected";
}

export function subscribeTaskLiveRefresh(onChange: () => void, pollMs: number): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = (ev?: Event) => {
    const detail = (ev as CustomEvent<TaskChangeDetail> | undefined)?.detail;
    if (shouldIgnoreTaskLiveEvent(detail)) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(onChange, REFETCH_DEBOUNCE_MS);
  };
  const onVisible = () => {
    if (document.visibilityState === "visible") schedule();
  };

  window.addEventListener(TASK_CHANGE_EVENT, schedule);
  document.addEventListener("visibilitychange", onVisible);
  const pollTimer =
    pollMs > 0
      ? setInterval(() => {
          if (document.visibilityState === "visible") onChange();
        }, pollMs)
      : undefined;

  return () => {
    if (timer) clearTimeout(timer);
    if (pollTimer) clearInterval(pollTimer);
    window.removeEventListener(TASK_CHANGE_EVENT, schedule);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

export type { TaskChangeDetail };
