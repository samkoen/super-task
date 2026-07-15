import { useEffect } from "react";
import {
  NOTIFICATION_EVENT,
  TASK_CHANGE_EVENT,
  type TaskChangeDetail,
} from "../constants/events";

const RECONNECT_MS = 3000;

function parseDetail(raw: string): TaskChangeDetail | undefined {
  try {
    return JSON.parse(raw) as TaskChangeDetail;
  } catch {
    return undefined;
  }
}

export function dispatchTaskEventFromPayload(raw: string) {
  const detail = parseDetail(raw);
  if (detail?.type === "notification") {
    window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT, { detail }));
    if (detail.kind?.startsWith("task_")) {
      window.dispatchEvent(new CustomEvent(TASK_CHANGE_EVENT, { detail }));
    }
    return;
  }
  window.dispatchEvent(new CustomEvent(TASK_CHANGE_EVENT, { detail }));
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
        dispatchTaskEventFromPayload((ev as MessageEvent).data as string);
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
