import { describe, expect, it } from "vitest";
import type { TaskOccurrence } from "../services/taskService";
import { filterTasksForEmployee } from "./employeeDrawerTasks";

function occ(partial: Partial<TaskOccurrence> & Pick<TaskOccurrence, "id">): TaskOccurrence {
  return {
    template_id: null,
    branch_id: "b1",
    title: "t",
    description: "",
    due_at: "2026-07-19T12:00:00+03:00",
    status: "pending",
    assignee_user_id: null,
    department_id: null,
    task_kind: "ad_hoc",
    manager_user_id: null,
    photo_required: true,
    started_at: null,
    created_at: "2026-07-19T08:00:00+03:00",
    updated_at: "2026-07-19T08:00:00+03:00",
    ...partial,
  };
}

describe("filterTasksForEmployee", () => {
  it("keeps only the selected assignee", () => {
    const rows = [
      occ({ id: "1", assignee_user_id: "u1" }),
      occ({ id: "2", assignee_user_id: "u2" }),
      occ({ id: "3", assignee_user_id: "u1" }),
    ];
    expect(filterTasksForEmployee(rows, "u1").map((t) => t.id)).toEqual(["1", "3"]);
  });

  it("returns empty for blank employee id", () => {
    expect(filterTasksForEmployee([occ({ id: "1", assignee_user_id: "u1" })], "  ")).toEqual([]);
  });
});
