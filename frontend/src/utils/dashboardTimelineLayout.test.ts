import { describe, expect, it } from "vitest";
import type { TimelineTask } from "../services/dashboardService";
import {
  barWidthPercent,
  buildTimelineRows,
  isLongInProgress,
  sortCompletedTasks,
} from "./dashboardTimelineLayout";

function task(partial: Partial<TimelineTask> & Pick<TimelineTask, "id">): TimelineTask {
  return {
    title: "test",
    status: "pending",
    segment: "upcoming",
    due_at: "2026-07-14T11:00:00+03:00",
    started_at: null,
    completed_at: null,
    duration_minutes: null,
    elapsed_minutes: null,
    department_name: null,
    assignee_name: null,
    task_kind: "fixed",
    ...partial,
  };
}

describe("dashboardTimelineLayout", () => {
  it("buildTimelineRows orders completed, in progress, pending review, upcoming, overdue", () => {
    const rows = buildTimelineRows(
      [
        task({ id: "1", segment: "upcoming", due_at: "2026-07-14T14:00:00+03:00" }),
        task({ id: "2", segment: "completed", started_at: "2026-07-14T08:00:00+03:00", duration_minutes: 30 }),
        task({ id: "3", segment: "in_progress", started_at: "2026-07-14T10:00:00+03:00", elapsed_minutes: 20 }),
        task({
          id: "5",
          segment: "pending_review",
          started_at: "2026-07-14T09:00:00+03:00",
          completed_at: "2026-07-14T09:30:00+03:00",
        }),
      ],
      [task({ id: "4", segment: "overdue", due_at: "2026-07-13T07:00:00+03:00" })],
    );
    expect(rows.map((r) => r.task.id)).toEqual(["2", "3", "5", "1", "4"]);
  });

  it("barWidthPercent scales with duration", () => {
    const short = task({ id: "a", segment: "completed", duration_minutes: 30 });
    const long = task({ id: "b", segment: "completed", duration_minutes: 90 });
    expect(barWidthPercent(long, "completed")).toBeGreaterThan(barWidthPercent(short, "completed"));
  });

  it("isLongInProgress at 120 minutes", () => {
    expect(isLongInProgress(task({ id: "x", segment: "in_progress", elapsed_minutes: 119 }))).toBe(false);
    expect(isLongInProgress(task({ id: "y", segment: "in_progress", elapsed_minutes: 120 }))).toBe(true);
  });

  it("sortCompletedTasks by completed_at desc", () => {
    const sorted = sortCompletedTasks([
      task({ id: "a", segment: "completed", completed_at: "2026-07-14T09:00:00+03:00" }),
      task({ id: "b", segment: "completed", completed_at: "2026-07-14T11:00:00+03:00" }),
    ]);
    expect(sorted.map((t) => t.id)).toEqual(["b", "a"]);
  });
});
