import { describe, expect, it } from "vitest";
import {
  isTaskChatAlertKind,
  notificationIdToLocalId,
  shouldShowTaskChatBanner,
  taskChatAlertPath,
} from "./taskChatAlert";

describe("taskChatAlert", () => {
  it("recognizes only task-chat kinds", () => {
    expect(isTaskChatAlertKind("task_message_manager")).toBe(true);
    expect(isTaskChatAlertKind("task_message_employee")).toBe(true);
    expect(isTaskChatAlertKind("task_created")).toBe(false);
  });

  it("hides the banner on break or when already viewing the task", () => {
    expect(
      shouldShowTaskChatBanner({
        kind: "task_message_manager",
        onBreak: true,
        occurrenceId: "occ-1",
        viewingOccurrenceId: null,
      }),
    ).toBe(false);
    expect(
      shouldShowTaskChatBanner({
        kind: "task_message_manager",
        onBreak: false,
        occurrenceId: "occ-1",
        viewingOccurrenceId: "occ-1",
      }),
    ).toBe(false);
    expect(
      shouldShowTaskChatBanner({
        kind: "task_message_manager",
        onBreak: false,
        occurrenceId: "occ-1",
        viewingOccurrenceId: null,
      }),
    ).toBe(true);
  });

  it("routes oved replies to the employee task and questions to the manager list", () => {
    expect(taskChatAlertPath("task_message_manager", "employee", "occ-1")).toBe(
      "/employee?task=occ-1",
    );
    expect(taskChatAlertPath("task_message_employee", "branch_manager", "occ-1")).toBe(
      "/manager/tasks?task=occ-1",
    );
  });

  it("maps a notification id to a positive local id", () => {
    expect(notificationIdToLocalId("n1")).toBeGreaterThan(0);
    expect(notificationIdToLocalId("n1")).toBe(notificationIdToLocalId("n1"));
  });
});
