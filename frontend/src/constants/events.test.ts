import { describe, expect, it, vi } from "vitest";
import {
  dispatchManualLiveRefresh,
  MANUAL_REFRESH_TYPE,
  NOTIFICATION_EVENT,
  TASK_CHANGE_EVENT,
} from "./events";

describe("dispatchManualLiveRefresh", () => {
  it("notifies task pages and the bell", () => {
    const task = vi.fn();
    const notif = vi.fn();
    window.addEventListener(TASK_CHANGE_EVENT, task);
    window.addEventListener(NOTIFICATION_EVENT, notif);
    dispatchManualLiveRefresh();
    expect(task.mock.calls[0][0].detail.type).toBe(MANUAL_REFRESH_TYPE);
    expect(notif.mock.calls[0][0].detail.type).toBe(MANUAL_REFRESH_TYPE);
    window.removeEventListener(TASK_CHANGE_EVENT, task);
    window.removeEventListener(NOTIFICATION_EVENT, notif);
  });
});
