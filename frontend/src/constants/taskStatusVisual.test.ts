import { describe, expect, it } from "vitest";
import type { TaskStatus } from "../services/taskService";
import { TASK_STATUS_VISUAL, taskStatusChipColor, taskStatusVisual } from "./taskStatusVisual";

const ALL: TaskStatus[] = [
  "pending",
  "in_progress",
  "pending_review",
  "completed",
  "overdue",
  "cancelled",
];

describe("taskStatusVisual", () => {
  it("defines a visual for every status", () => {
    for (const status of ALL) {
      const visual = taskStatusVisual(status);
      expect(visual.bar).toMatch(/^#/);
      expect(visual.border).toMatch(/^#/);
      expect(visual.surface).toMatch(/^#/);
      expect(visual.chip).toBeTruthy();
    }
  });

  it("keeps pending and in_progress visually distinct", () => {
    const pending = TASK_STATUS_VISUAL.pending;
    const inProgress = TASK_STATUS_VISUAL.in_progress;
    expect(pending.chip).not.toBe(inProgress.chip);
    expect(pending.bar).not.toBe(inProgress.bar);
    expect(taskStatusChipColor("pending")).toBe("default");
    expect(taskStatusChipColor("in_progress")).toBe("warning");
  });

  it("marks overdue as error red", () => {
    expect(taskStatusChipColor("overdue")).toBe("error");
    expect(TASK_STATUS_VISUAL.overdue.bar).toBe("#D32F2F");
  });
});
