import { useEffect } from "react";
import { TASK_CHANGE_EVENT, NOTIFICATION_EVENT } from "../constants/events";

const RECONNECT_MS = 3000;

function dispatchFromPayload(raw: string) {
  try {
    const data = JSON.parse(raw) as { type?: string };
    if (data.type === "notification") {
      window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT));
      return;
    }
  } catch {
    /* fall through */
  }
  window.dispatchEvent(new CustomEvent(TASK_CHANGE_EVENT));
}

/** Opens one SSE connection and broadcasts task changes app-wide. */
export function useTaskEventSource(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    let source: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    const attach = (es: EventSource) => {
      es.addEventListener("connected", () => {
        /* stream is alive */
      });
      es.addEventListener("ping", () => {
        /* keep-alive from server */
      });
      es.addEventListener("task", (ev) => {
        dispatchFromPayload((ev as MessageEvent).data as string);
      });
      es.onerror = () => {
        es.close();
        if (source === es) source = null;
        if (!stopped) {
          reconnectTimer = setTimeout(connect, RECONNECT_MS);
        }
      };
    };

    const connect = () => {
      if (stopped) return;
      source = new EventSource("/api/events/stream");
      attach(source);
    };

    connect();

    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      source?.close();
      source = null;
    };
  }, [enabled]);
}
