import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { NOTIFICATION_EVENT } from "../constants/events";
import { useEmployeeNotificationSounds } from "./useEmployeeNotificationSounds";

const playNotificationSound = vi.fn();

vi.mock("../utils/notificationSounds", () => ({
  bindNotificationAudioUnlock: () => () => undefined,
  playNotificationSound: (...args: unknown[]) => playNotificationSound(...args),
  soundKindFromNotificationKind: (kind: string | undefined) =>
    kind === "break_override" ? "manager_question" : "new_task",
}));

describe("useEmployeeNotificationSounds", () => {
  afterEach(() => {
    playNotificationSound.mockReset();
  });

  it("plays ordinary alerts when not muted", () => {
    renderHook(() => useEmployeeNotificationSounds(true, false));
    window.dispatchEvent(
      new CustomEvent(NOTIFICATION_EVENT, { detail: { kind: "task_created", sound: "new_task" } }),
    );
    expect(playNotificationSound).toHaveBeenCalledWith("new_task");
  });

  it("mutes ordinary alerts on break and still rings an emergency", () => {
    renderHook(() => useEmployeeNotificationSounds(true, true));
    window.dispatchEvent(
      new CustomEvent(NOTIFICATION_EVENT, { detail: { kind: "direct_message", sound: "none" } }),
    );
    expect(playNotificationSound).not.toHaveBeenCalled();
    window.dispatchEvent(
      new CustomEvent(NOTIFICATION_EVENT, {
        detail: { kind: "break_override", sound: "task_end" },
      }),
    );
    expect(playNotificationSound).toHaveBeenCalledWith("task_end");
  });
});
