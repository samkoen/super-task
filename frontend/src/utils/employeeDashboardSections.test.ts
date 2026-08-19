import { describe, expect, it } from "vitest";
import {
  collectUniqueTasks,
  isDynamicEmployeeTask,
  shouldHighlightEmployeeTask,
  splitEmployeeWorkLists,
} from "./employeeDashboardSections";

function task(
  id: string,
  over: { task_kind?: string; status?: string; due_at?: string } = {},
) {
  return {
    id,
    task_kind: over.task_kind ?? "fixed",
    status: over.status ?? "pending",
    due_at: over.due_at ?? "2026-08-19T12:00:00+03:00",
  };
}

describe("employeeDashboardSections", () => {
  it("puts ad-hoc, overdue and dashboard-urgent into dynamic", () => {
    const urgentIds = new Set(["soon"]);
    expect(isDynamicEmployeeTask(task("a", { task_kind: "ad_hoc" }), urgentIds)).toBe(true);
    expect(isDynamicEmployeeTask(task("b", { status: "overdue" }), urgentIds)).toBe(true);
    expect(isDynamicEmployeeTask(task("soon"), urgentIds)).toBe(true);
    expect(isDynamicEmployeeTask(task("ok"), urgentIds)).toBe(false);
  });

  it("highlights overdue and awaiting-response only", () => {
    expect(shouldHighlightEmployeeTask("overdue")).toBe(true);
    expect(shouldHighlightEmployeeTask("awaiting_response")).toBe(true);
    expect(shouldHighlightEmployeeTask("pending")).toBe(false);
    expect(shouldHighlightEmployeeTask("in_progress")).toBe(false);
  });

  it("dedupes then splits routine vs dynamic, excluding review", () => {
    const a = task("a", { task_kind: "fixed", due_at: "2026-08-19T18:00:00+03:00" });
    const b = task("b", { task_kind: "ad_hoc", due_at: "2026-08-19T10:00:00+03:00" });
    const late = task("c", { status: "overdue", due_at: "2026-08-19T08:00:00+03:00" });
    const review = task("d", { status: "pending_review" });
    const { dynamic, routine } = splitEmployeeWorkLists(
      collectUniqueTasks([[a, b], [a, late, review]]),
      new Set(),
    );
    expect(routine.map((t) => t.id)).toEqual(["a"]);
    expect(dynamic.map((t) => t.id)).toEqual(["c", "b"]);
  });
});
