import { describe, expect, it } from "vitest";
import type { TeamMember, TimelineTask } from "../services/dashboardService";
import {
  buildStatusAnalysisRows,
  columnForTask,
  groupPendingTasks,
  sumStatusAnalysis,
} from "./storeStatusAnalysis";

function task(partial: Partial<TimelineTask> & Pick<TimelineTask, "id" | "status" | "segment">): TimelineTask {
  return {
    title: partial.title ?? partial.id,
    due_at: partial.due_at ?? "2026-07-14T10:00:00+03:00",
    started_at: partial.started_at ?? null,
    completed_at: partial.completed_at ?? null,
    duration_minutes: null,
    elapsed_minutes: null,
    department_name: partial.department_name ?? null,
    assignee_name: partial.assignee_name ?? null,
    task_kind: "fixed",
    ...partial,
  };
}

describe("columnForTask", () => {
  it("maps statuses to analysis columns", () => {
    expect(columnForTask(task({ id: "1", status: "awaiting_response", segment: "awaiting_response" }))).toBe(
      "awaiting_response",
    );
    expect(columnForTask(task({ id: "2", status: "pending", segment: "upcoming" }))).toBe("pending");
    expect(columnForTask(task({ id: "3", status: "in_progress", segment: "in_progress" }))).toBe(
      "in_progress",
    );
    expect(columnForTask(task({ id: "4", status: "pending_review", segment: "pending_review" }))).toBe(
      "pending_review",
    );
    expect(columnForTask(task({ id: "5", status: "completed", segment: "completed" }))).toBe(
      "completed_today",
    );
  });
});

describe("buildStatusAnalysisRows", () => {
  it("aggregates counts per employee and totals", () => {
    const team: TeamMember[] = [
      {
        user_id: "u1",
        full_name: "ראובן",
        job_function: "מחסן",
        is_active: true,
        status: "active",
        current_task_title: null,
        current_department_name: null,
        completed_today: 1,
        total_today: 3,
        open_tasks: 2,
        timeline: [
          task({ id: "a", status: "pending", segment: "upcoming", assignee_name: "ראובן" }),
          task({ id: "b", status: "pending", segment: "upcoming", assignee_name: "ראובן" }),
          task({ id: "c", status: "completed", segment: "completed", assignee_name: "ראובן" }),
        ],
        overdue_backlog: [],
      },
    ];
    const rows = buildStatusAnalysisRows(team);
    expect(rows).toHaveLength(1);
    expect(rows[0].counts.pending).toBe(2);
    expect(rows[0].counts.completed_today).toBe(1);
    expect(sumStatusAnalysis(rows).counts.pending).toBe(2);
  });

  it("returns empty for empty team", () => {
    expect(buildStatusAnalysisRows([])).toEqual([]);
    expect(buildStatusAnalysisRows(null)).toEqual([]);
  });
});

describe("groupPendingTasks", () => {
  const tasks = [
    task({
      id: "1",
      status: "pending",
      segment: "upcoming",
      assignee_name: "ראובן",
      department_name: "מחסן",
    }),
    task({
      id: "2",
      status: "in_progress",
      segment: "in_progress",
      assignee_name: "שמעון",
      department_name: "קופות",
    }),
    task({
      id: "3",
      status: "pending",
      segment: "upcoming",
      assignee_name: "ראובן",
      department_name: "מחסן",
    }),
  ];

  it("groups by assignee", () => {
    const groups = groupPendingTasks(tasks, "assignee");
    expect(groups).toHaveLength(2);
    const reuven = groups.find((g) => g.label.includes("ראובן"));
    expect(reuven?.tasks).toHaveLength(2);
  });

  it("groups by department", () => {
    const groups = groupPendingTasks(tasks, "department");
    expect(groups.map((g) => g.key).sort()).toEqual(["מחסן", "קופות"]);
  });
});
