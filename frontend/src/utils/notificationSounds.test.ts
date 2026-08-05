import { describe, expect, it } from "vitest";
import { playNotificationSound, soundKindFromNotificationKind } from "./notificationSounds";

describe("soundKindFromNotificationKind", () => {
  it("maps new task vs task end distinctly", () => {
    expect(soundKindFromNotificationKind("task_created")).toBe("new_task");
    expect(soundKindFromNotificationKind("task_cancelled")).toBe("task_end");
    expect(soundKindFromNotificationKind("task_reopened")).toBe("task_end");
    expect(soundKindFromNotificationKind("task_created")).not.toBe(
      soundKindFromNotificationKind("task_cancelled"),
    );
  });

  it("maps idle to alert", () => {
    expect(soundKindFromNotificationKind("employee_idle_no_tasks")).toBe("alert");
  });

  it("maps employee questions to manager_question sound", () => {
    expect(soundKindFromNotificationKind("task_message_employee")).toBe("manager_question");
    expect(soundKindFromNotificationKind("awaiting_response")).toBe("manager_question");
  });

  it("playNotificationSound is a no-op for none without throwing", () => {
    expect(() => playNotificationSound("none")).not.toThrow();
    expect(() => playNotificationSound(undefined)).not.toThrow();
  });
});
