import { useEffect } from "react";
import { TASK_CHANGE_EVENT } from "../constants/events";

/** Opens one SSE connection and broadcasts task changes app-wide. */
export function useTaskEventSource(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const source = new EventSource("/api/events/stream");

    const notify = () => {
      window.dispatchEvent(new CustomEvent(TASK_CHANGE_EVENT));
    };

    source.addEventListener("task", notify);
    source.onerror = () => {
      /* EventSource reconnects automatically */
    };

    return () => {
      source.removeEventListener("task", notify);
      source.close();
    };
  }, [enabled]);
}
