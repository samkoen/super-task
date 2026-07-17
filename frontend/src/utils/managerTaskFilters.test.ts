import { describe, expect, it } from "vitest";
import type { TaskOccurrence } from "../services/taskService";
import {
  buildManagerTasksPath,
  filterManagerTaskOccurrences,
  parseManagerTasksSearchParams,
} from "./managerTaskFilters";

function task(partial: Partial<TaskOccurrence> & Pick<TaskOccurrence, "id" | "status">): TaskOccurrence {
  return {
    template_id: null,
    branch_id: "b1",
    title: "T",
    description: "",
    due_at: "2026-07-17T09:00:00+03:00",
    assignee_user_id: null,
    department_id: null,
    task_kind: "fixed",
    manager_user_id: null,
    photo_required: false,
    started_at: null,
    created_at: "2026-07-17T00:00:00+03:00",
    updated_at: "2026-07-17T00:00:00+03:00",
    ...partial,
  };
}

describe("filterManagerTaskOccurrences", () => {
  const rows = [
    task({ id: "1", status: "pending", assignee_user_id: "e1" }),
    task({ id: "2", status: "completed", assignee_user_id: "e1" }),
    task({ id: "3", status: "pending", assignee_user_id: "e2" }),
    task({ id: "4", status: "overdue", assignee_user_id: null }),
  ];

  it("returns all when no filters", () => {
    expect(filterManagerTaskOccurrences(rows, {}).map((r) => r.id)).toEqual(["1", "2", "3", "4"]);
  });

  it("filters by employee", () => {
    expect(filterManagerTaskOccurrences(rows, { employeeId: "e1" }).map((r) => r.id)).toEqual(["1", "2"]);
  });

  it("filters by status", () => {
    expect(filterManagerTaskOccurrences(rows, { status: "pending" }).map((r) => r.id)).toEqual(["1", "3"]);
  });

  it("combines employee and status", () => {
    expect(
      filterManagerTaskOccurrences(rows, { employeeId: "e1", status: "completed" }).map((r) => r.id)
    ).toEqual(["2"]);
  });

  it("returns empty for unmatched status", () => {
    expect(filterManagerTaskOccurrences(rows, { status: "cancelled" })).toEqual([]);
  });
});

describe("manager tasks URL helpers", () => {
  it("builds overdue deep link", () => {
    expect(buildManagerTasksPath({ status: "overdue", dueOn: "2026-07-17" })).toBe(
      "/manager/tasks?status=overdue&due_on=2026-07-17"
    );
  });

  it("builds employee deep link", () => {
    expect(buildManagerTasksPath({ employeeId: "u1", dueOn: "2026-07-17" })).toBe(
      "/manager/tasks?employee=u1&due_on=2026-07-17"
    );
  });

  it("parses overdue into a date range so past due tasks remain visible", () => {
    const parsed = parseManagerTasksSearchParams(
      new URLSearchParams("status=overdue&due_on=2026-07-17")
    );
    expect(parsed.status).toBe("overdue");
    expect(parsed.dateViewMode).toBe("range");
    expect(parsed.rangeTo).toBe("2026-07-17");
    expect(parsed.rangeFrom).toBe("2026-06-17");
  });

  it("parses employee filter", () => {
    const parsed = parseManagerTasksSearchParams(
      new URLSearchParams("employee=emp-9&due_on=2026-07-17")
    );
    expect(parsed.employeeId).toBe("emp-9");
    expect(parsed.status).toBe("");
  });
});
