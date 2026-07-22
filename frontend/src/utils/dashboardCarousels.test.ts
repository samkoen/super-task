import { describe, expect, it } from "vitest";
import type { TaskQueues, TimelineTask } from "../services/dashboardService";
import {
  buildActionQueue,
  buildPendingTasks,
  filterPendingTasks,
  uniqueAssignees,
  uniqueDepartments,
} from "./dashboardCarousels";

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

const queues: TaskQueues = {
  completed: [],
  in_progress: [
    task({
      id: "ip1",
      status: "in_progress",
      segment: "in_progress",
      department_name: "ירקות",
      assignee_name: "יוסי",
      due_at: "2026-07-14T11:00:00+03:00",
    }),
  ],
  pending_review: [
    task({
      id: "pr1",
      status: "pending_review",
      segment: "pending_review",
      completed_at: "2026-07-14T09:30:00+03:00",
      assignee_name: "דנה",
    }),
  ],
  upcoming: [
    task({
      id: "up1",
      status: "pending",
      segment: "upcoming",
      department_name: "קירור",
      assignee_name: "יוסי",
      due_at: "2026-07-14T16:00:00+03:00",
    }),
    task({
      id: "ov1",
      status: "overdue",
      segment: "overdue",
      department_name: "ירקות",
      assignee_name: "דנה",
      due_at: "2026-07-14T08:00:00+03:00",
    }),
  ],
};

describe("buildActionQueue", () => {
  it("lists pending_review items for manager action", () => {
    const items = buildActionQueue(queues);
    expect(items).toHaveLength(1);
    expect(items[0].reason).toBe("pending_review");
    expect(items[0].task.id).toBe("pr1");
  });

  it("puts awaiting_response before pending_review when present", () => {
    const withQuestion: TaskQueues = {
      ...queues,
      upcoming: [
        ...queues.upcoming,
        task({
          id: "q1",
          status: "awaiting_response" as TimelineTask["status"],
          segment: "upcoming",
        }),
      ],
    };
    const items = buildActionQueue(withQuestion);
    expect(items[0].task.id).toBe("q1");
    expect(items[0].reason).toBe("awaiting_response");
    expect(items[1].reason).toBe("pending_review");
  });

  it("returns empty when no queues", () => {
    expect(buildActionQueue(null)).toEqual([]);
  });
});

describe("buildPendingTasks + filters", () => {
  it("includes in_progress and upcoming, excludes pending_review", () => {
    const pending = buildPendingTasks(queues);
    expect(pending.map((t) => t.id).sort()).toEqual(["ip1", "ov1", "up1"]);
  });

  it("filters by department and assignee", () => {
    const pending = buildPendingTasks(queues);
    const filtered = filterPendingTasks(pending, {
      department: "ירקות",
      assignee: "יוסי",
    });
    expect(filtered.map((t) => t.id)).toEqual(["ip1"]);
  });

  it("lists unique filter options", () => {
    const pending = buildPendingTasks(queues);
    expect(uniqueDepartments(pending)).toEqual(["ירקות", "קירור"]);
    expect(uniqueAssignees(pending)).toEqual(["דנה", "יוסי"]);
  });
});
