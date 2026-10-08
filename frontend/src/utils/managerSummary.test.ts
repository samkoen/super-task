import { describe, expect, it } from "vitest";
import { buildManagerSummary, isManagerAllClear } from "./managerSummary";
import type { ManagerDashboard, TimelineTask } from "../services/dashboardService";

function task(id: string, partial: Partial<TimelineTask> = {}): TimelineTask {
  return {
    id,
    title: `task ${id}`,
    status: "pending_review",
    segment: "pending_review",
    due_at: "2026-07-14T10:00:00+03:00",
    started_at: null,
    completed_at: "2026-07-14T09:30:00+03:00",
    duration_minutes: null,
    elapsed_minutes: null,
    department_name: null,
    assignee_name: "יוסי",
    task_kind: "fixed",
    ...partial,
  } as TimelineTask;
}

function dash(partial: Partial<ManagerDashboard> = {}): ManagerDashboard {
  return {
    due_on: "2026-07-14",
    branch: null,
    health: "green",
    counts: {
      tasks_total: 10,
      tasks_completed: 4,
      tasks_pending: 6,
      tasks_in_progress: 0,
      tasks_overdue: 2,
      tasks_cancelled: 0,
      completion_rate: 0.4,
    },
    store_kpis: null,
    by_department: null,
    team: [],
    task_queues: { completed: [], in_progress: [], pending_review: [], upcoming: [] },
    unfinished_tasks: null,
    recent_alerts: [],
    branches: [],
    ...partial,
  } as ManagerDashboard;
}

describe("buildManagerSummary", () => {
  it("counts reviews, overdue, completion and direct chats", () => {
    const summary = buildManagerSummary(
      dash({
        task_queues: {
          completed: [],
          in_progress: [],
          upcoming: [],
          pending_review: [task("a"), task("b")],
        },
      }),
      3,
    );
    expect(summary).toMatchObject({
      reviews: 2,
      messages: 3,
      overdue: 2,
      completed: 4,
      total: 10,
      completionPct: 40,
    });
  });

  it("prefers overdue_open when the backend provides it", () => {
    const base = dash();
    const summary = buildManagerSummary(
      dash({ counts: { ...base.counts, overdue_open: 5 } }),
      0,
    );
    expect(summary.overdue).toBe(5);
  });

  it("clamps invalid values and handles an empty dashboard", () => {
    const base = dash();
    const summary = buildManagerSummary(
      dash({
        counts: { ...base.counts, completion_rate: Number.NaN, tasks_overdue: -3 },
        task_queues: null as unknown as ManagerDashboard["task_queues"],
      }),
      -2,
    );
    expect(summary.completionPct).toBe(0);
    expect(summary.overdue).toBe(0);
    expect(summary.messages).toBe(0);
    expect(summary.reviews).toBe(0);
  });

  it("caps the completion percentage at 100", () => {
    const base = dash();
    expect(
      buildManagerSummary(dash({ counts: { ...base.counts, completion_rate: 1.4 } }), 0)
        .completionPct,
    ).toBe(100);
  });
});

describe("isManagerAllClear", () => {
  it("is true only when nothing waits on the manager", () => {
    const clear = { reviews: 0, messages: 0, overdue: 0, completed: 1, total: 1, completionPct: 100 };
    expect(isManagerAllClear(clear)).toBe(true);
    expect(isManagerAllClear({ ...clear, overdue: 1 })).toBe(false);
    expect(isManagerAllClear({ ...clear, reviews: 1 })).toBe(false);
    expect(isManagerAllClear({ ...clear, messages: 1 })).toBe(false);
  });
});
