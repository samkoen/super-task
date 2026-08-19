import { describe, expect, it } from "vitest";
import { he } from "../i18n/he";
import {
  applyStartedOnDashboard,
  canDoTask,
  cardAfterStart,
  doTaskButtonLabel,
  needsTaskStart,
} from "./employeeDoTask";

describe("employeeDoTask", () => {
  it("starts pending and overdue, not already in progress", () => {
    expect(needsTaskStart("pending")).toBe(true);
    expect(needsTaskStart("overdue")).toBe(true);
    expect(needsTaskStart("in_progress")).toBe(false);
    expect(canDoTask("pending")).toBe(true);
    expect(canDoTask("in_progress")).toBe(true);
    expect(canDoTask("pending_review")).toBe(false);
  });

  it("labels first click as do-task and resume as finish", () => {
    expect(doTaskButtonLabel("pending")).toBe(he.doTask);
    expect(doTaskButtonLabel("overdue")).toBe(he.doTask);
    expect(doTaskButtonLabel("in_progress")).toBe(he.markDone);
  });

  it("merges start API onto the card", () => {
    const next = cardAfterStart(
      { id: "t1", status: "pending", started_at: null },
      { status: "in_progress", started_at: "2026-08-19T10:00:00+03:00" },
    );
    expect(next.status).toBe("in_progress");
    expect(next.started_at).toBe("2026-08-19T10:00:00+03:00");
  });

  it("moves the started card into in-progress on the dashboard", () => {
    const updated = { id: "t1", status: "in_progress" };
    const next = applyStartedOnDashboard(
      {
        on_shift: false,
        urgent_tasks: [{ id: "t1", status: "pending" }],
        today_tasks: [{ id: "t1", status: "pending" }],
        in_progress_tasks: [],
      },
      "t1",
      updated,
    );
    expect(next?.on_shift).toBe(true);
    expect(next?.urgent_tasks).toEqual([]);
    expect(next?.today_tasks).toEqual([]);
    expect(next?.in_progress_tasks).toEqual([updated]);
  });

  it("is a noop when dashboard is missing", () => {
    expect(applyStartedOnDashboard(null, "t1", { id: "t1" })).toBeNull();
  });
});
