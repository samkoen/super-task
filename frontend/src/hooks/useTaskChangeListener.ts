import { useEffect, useRef } from "react";
import { TASK_CHANGE_EVENT, type TaskChangeDetail } from "../constants/events";

const REFETCH_DEBOUNCE_MS = 300;
const POLL_MS = 25_000;

/**
 * Refetch handler for pages that display tasks (debounced SSE + focus + poll).
 * Ignore `sse_connected` — on Vercel/WebView the stream reconnects often and
 * a full list reload each time freezes the UI.
 */
export function useTaskChangeListener(
  onChange: () => void,
  options?: { pollMs?: number | false },
) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const pollMs = options?.pollMs === false ? 0 : (options?.pollMs ?? POLL_MS);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = (ev?: Event) => {
      const detail = (ev as CustomEvent<TaskChangeDetail> | undefined)?.detail;
      if (detail?.type === "sse_connected") return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => onChangeRef.current(), REFETCH_DEBOUNCE_MS);
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        schedule();
      }
    };

    window.addEventListener(TASK_CHANGE_EVENT, schedule);
    document.addEventListener("visibilitychange", onVisible);

    let pollTimer: ReturnType<typeof setInterval> | undefined;
    if (pollMs > 0) {
      pollTimer = setInterval(() => {
        if (document.visibilityState === "visible") {
          onChangeRef.current();
        }
      }, pollMs);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (pollTimer) clearInterval(pollTimer);
      window.removeEventListener(TASK_CHANGE_EVENT, schedule);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pollMs]);
}

export type { TaskChangeDetail };
