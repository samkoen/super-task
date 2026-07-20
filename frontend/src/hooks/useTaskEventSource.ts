import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import {
  NOTIFICATION_EVENT,
  TASK_CHANGE_EVENT,
  type TaskChangeDetail,
} from "../constants/events";

const RECONNECT_MS_MIN = 5_000;
const RECONNECT_MS_MAX = 60_000;

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

/**
 * SSE app-wide. Désactivé sur Capacitor natif : le WebView + Vercel serverless
 * se reconnectent en boucle et figent משימות. L'app s'appuie alors sur le poll.
 */
export function useTaskEventSource(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    if (Capacitor.isNativePlatform()) return;

    let source: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    let attempt = 0;
    let announcedConnected = false;

    const scheduleReconnect = () => {
      if (stopped) return;
      const delay = Math.min(
        RECONNECT_MS_MAX,
        RECONNECT_MS_MIN * 2 ** Math.min(attempt, 4)
      );
      attempt += 1;
      reconnectTimer = setTimeout(() => {
        void connect();
      }, delay);
    };

    const attach = (es: EventSource) => {
      es.addEventListener("connected", () => {
        attempt = 0;
        // Une seule fois par montage — évite reload liste à chaque reconnect.
        if (announcedConnected) return;
        announcedConnected = true;
        window.dispatchEvent(
          new CustomEvent(TASK_CHANGE_EVENT, { detail: { type: "sse_connected" } }),
        );
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
