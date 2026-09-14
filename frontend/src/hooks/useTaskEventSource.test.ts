import { describe, expect, it, vi, afterEach } from "vitest";
import { TASK_CHANGE_EVENT, NOTIFICATION_EVENT } from "../constants/events";
import {
  dispatchTaskEventFromPayload,
  hasActiveSession,
  shouldOpenTaskEventSource,
} from "./useTaskEventSource";

describe("dispatchTaskEventFromPayload", () => {
  it("dispatches task change for task SSE events", () => {
    const taskHandler = vi.fn();
    window.addEventListener(TASK_CHANGE_EVENT, taskHandler);
    dispatchTaskEventFromPayload(JSON.stringify({ type: "task_created", branch_id: "b1" }));
    expect(taskHandler).toHaveBeenCalledTimes(1);
    window.removeEventListener(TASK_CHANGE_EVENT, taskHandler);
  });

  it("dispatches task change for task-related notifications", () => {
    const taskHandler = vi.fn();
    const notifHandler = vi.fn();
    window.addEventListener(TASK_CHANGE_EVENT, taskHandler);
    window.addEventListener(NOTIFICATION_EVENT, notifHandler);
    dispatchTaskEventFromPayload(
      JSON.stringify({ type: "notification", kind: "task_created", notification_id: "n1" }),
    );
    expect(notifHandler).toHaveBeenCalledTimes(1);
    expect(taskHandler).toHaveBeenCalledTimes(1);
    window.removeEventListener(TASK_CHANGE_EVENT, taskHandler);
    window.removeEventListener(NOTIFICATION_EVENT, notifHandler);
  });
});

describe("shouldOpenTaskEventSource", () => {
  it("opens SSE only in local non-native browsers", () => {
    expect(shouldOpenTaskEventSource(false, false)).toBe(true);
  });

  it("skips SSE on native even in local Vite", () => {
    expect(shouldOpenTaskEventSource(true, false)).toBe(false);
  });

  it("skips SSE on production web so Vercel does not hold a 120s stream", () => {
    expect(shouldOpenTaskEventSource(false, true)).toBe(false);
  });
});

describe("hasActiveSession", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false when /auth/me is unauthorized", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401 }),
    );
    await expect(hasActiveSession()).resolves.toBe(false);
  });

  it("returns true when /auth/me is ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200 }),
    );
    await expect(hasActiveSession()).resolves.toBe(true);
  });
});
