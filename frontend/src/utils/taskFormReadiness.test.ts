import { describe, expect, it } from "vitest";
import { taskFormMissing, taskFormMissingMessage, type TaskFormReadinessInput } from "./taskFormReadiness";
import { he } from "../i18n/he";

const base: TaskFormReadinessInput = {
  taskKind: "ad_hoc",
  grouped: false,
  canPickBranch: false,
  selectedBranchCount: 0,
  assigneeUserId: "u1",
  effectiveBranchId: "b1",
  toGallery: false,
  dueAt: "2026-10-08T10:00",
};

describe("taskFormMissing", () => {
  it("is empty when everything is filled", () => {
    expect(taskFormMissing(base)).toEqual([]);
  });

  it("asks for an assignee and a due date on a one-off task", () => {
    expect(taskFormMissing({ ...base, assigneeUserId: " ", dueAt: "" })).toEqual(["assignee", "dueAt"]);
  });

  it("does not require a due date for a fixed task or a gallery task", () => {
    expect(taskFormMissing({ ...base, taskKind: "fixed", dueAt: "" })).toEqual([]);
    expect(taskFormMissing({ ...base, toGallery: true, dueAt: "" })).toEqual([]);
  });

  it("asks to choose at least one snif for a network manager", () => {
    expect(taskFormMissing({ ...base, canPickBranch: true, selectedBranchCount: 0, effectiveBranchId: "" })).toEqual([
      "branches",
    ]);
  });

  it("needs no assignee when the task is created for several snifim, but still a due date", () => {
    const grouped = { ...base, grouped: true, canPickBranch: true, selectedBranchCount: 3, assigneeUserId: "" };
    expect(taskFormMissing(grouped)).toEqual([]);
    expect(taskFormMissing({ ...grouped, dueAt: "" })).toEqual(["dueAt"]);
  });

  it("asks for a branch when none is known", () => {
    expect(taskFormMissing({ ...base, effectiveBranchId: "" })).toEqual(["branch"]);
  });
});

describe("taskFormMissingMessage", () => {
  it("is empty when nothing is missing", () => {
    expect(taskFormMissingMessage([])).toBe("");
  });

  it("lists everything that is missing", () => {
    const text = taskFormMissingMessage(["assignee", "dueAt"]);
    expect(text).toContain(he.newTaskMissingAssignee);
    expect(text).toContain(he.newTaskMissingDueAt);
  });
});
