import { describe, expect, it, vi } from "vitest";
import { TASK_CHANGE_EVENT, NOTIFICATION_EVENT } from "../constants/events";
import { dispatchTaskEventFromPayload } from "./useTaskEventSource";

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
