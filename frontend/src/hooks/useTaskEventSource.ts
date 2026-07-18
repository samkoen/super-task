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

/** true si une session cookie est encore valide. */
export async function hasActiveSession(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    return res.ok;
  } catch {
    return false;
  }
}

/** Opens one SSE connection and broadcasts task changes app-wide. */
export function useTaskEventSource(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    let source: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    const scheduleReconnect = () => {
      if (stopped) return;
      reconnectTimer = setTimeout(() => {
        void connect();
      }, RECONNECT_MS);
    };

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
        if (stopped) return;
        // 401 / session expirée : ne pas spammer le serveur toutes les 3s
        void hasActiveSession().then((ok) => {
          if (!ok) {
            stopped = true;
            return;
          }
          scheduleReconnect();
        });
      };
    };

    const connect = async () => {
      if (stopped) return;
      if (!(await hasActiveSession())) {
        stopped = true;
        return;
      }
      source = new EventSource("/api/events/stream", { withCredentials: true });
      attach(source);
    };

    void connect();

    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      source?.close();
      source = null;
    };
  }, [enabled]);
}
