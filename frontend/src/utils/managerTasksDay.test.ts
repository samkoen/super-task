import { describe, expect, it } from "vitest";
import type { TaskOccurrence } from "../services/taskService";
import { he } from "../i18n/he";
import { shiftDay } from "./dateView";
import {
  dayNavLabel,
  groupTasksByPeriod,
  reviewQueueFromTasks,
  taskRowState,
  taskRowSubtitle,
  taskRowTime,
} from "./managerTasksDay";

const at = (hour: number, minute = 0, day = 16) => new Date(2026, 10, day, hour, minute).toISOString();

function task(id: string, hour: number, status: TaskOccurrence["status"], patch: Partial<TaskOccurrence> = {}): TaskOccurrence {
  return { id, title: id, due_at: at(hour), status, assignee_name: "דני", ...patch } as TaskOccurrence;
}

describe("taskRowState", () => {
  it("maps each status to the row look", () => {
    expect(["completed", "pending_review", "in_progress", "awaiting_response", "overdue", "pending"].map((status) =>
      taskRowState({ status } as TaskOccurrence))).toEqual(["done", "review", "active", "active", "late", "todo"]);
  });
});

describe("groupTasksByPeriod", () => {
  it("sorts by time, counts sent and closed tasks as done and hides empty periods", () => {
    const groups = groupTasksByPeriod([
      task("b", 9, "pending"),
      task("a", 7, "completed"),
      task("c", 8, "pending_review"),
      task("x", 10, "cancelled"),
      task("e", 19, "overdue"),
    ]);
    expect(groups.map((g) => [g.period, g.tasks.map((t) => t.id), g.done, g.total])).toEqual([
      ["morning", ["a", "c", "b"], 2, 3],
      ["evening", ["e"], 0, 1],
    ]);
  });
});

describe("row texts", () => {
  it("joins the oved and the status", () => {
    expect(taskRowSubtitle(task("a", 7, "pending_review"))).toBe(`דני · ${he.taskStatusLabels.pending_review}`);
    expect(taskRowSubtitle(task("a", 7, "pending", { assignee_name: null }))).toBe(`${he.managerTasksUnassigned} · ${he.taskStatusLabels.pending}`);
  });

  it("says a task finished without reception is waiting for its files, until they arrive", () => {
    const waiting = task("a", 7, "in_progress", { awaiting_upload_at: new Date(2026, 10, 16, 10, 42).toISOString() });
    expect(taskRowSubtitle(waiting)).toBe(`דני · ${he.managerTaskAwaitingUpload("10:42")}`);
    expect(taskRowSubtitle({ ...waiting, status: "pending_review" })).toBe(`דני · ${he.taskStatusLabels.pending_review}`);
    expect(taskRowState(waiting)).toBe("review");
    expect(taskRowState({ ...waiting, status: "completed" })).toBe("done");
  });

  it("adds the date only for another day", () => {
    expect(taskRowTime(at(6, 30), "2026-11-16")).toBe("06:30");
    expect(taskRowTime(at(6, 30, 14), "2026-11-16")).toBe("14.11 06:30");
  });

  it("names today, yesterday and tomorrow", () => {
    const today = "2026-11-16";
    expect(dayNavLabel(today, today)).toBe(he.managerTasksToday);
    expect(dayNavLabel(shiftDay(today, -1), today)).toBe(he.managerTasksYesterday);
    expect(dayNavLabel(shiftDay(today, 1), today)).toBe(he.managerTasksTomorrow);
  });
});

describe("reviewQueueFromTasks", () => {
  it("keeps the proofs waiting, in time order", () => {
    expect(reviewQueueFromTasks([task("b", 9, "pending_review"), task("a", 7, "pending_review"), task("c", 8, "completed")]))
      .toEqual([{ id: "a", title: "a" }, { id: "b", title: "b" }]);
  });
});
