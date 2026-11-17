import { describe, expect, it } from "vitest";
import { groupTodayTasks, isTodayTaskDone, periodForDue } from "./todayPeriods";

function at(hour: number, minute = 0): string {
  return new Date(2026, 10, 17, hour, minute).toISOString();
}

describe("todayPeriods", () => {
  it("splits the day at 12:00 and 18:00", () => {
    expect(periodForDue(at(7, 30))).toBe("morning");
    expect(periodForDue(at(11, 59))).toBe("morning");
    expect(periodForDue(at(12))).toBe("noon");
    expect(periodForDue(at(17, 59))).toBe("noon");
    expect(periodForDue(at(18))).toBe("evening");
    expect(periodForDue("not a date")).toBe("morning");
  });

  it("keeps only non-empty periods, in day order, sorted by hour", () => {
    const groups = groupTodayTasks([
      { id: "e", due_at: at(20), status: "pending" },
      { id: "m2", due_at: at(9), status: "pending" },
      { id: "m1", due_at: at(7), status: "completed" },
      { id: "x", due_at: at(13), status: "cancelled" },
    ]);
    expect(groups.map((g) => g.period)).toEqual(["morning", "evening"]);
    expect(groups[0].tasks.map((t) => t.id)).toEqual(["m1", "m2"]);
  });

  it("treats tasks sent for review as done", () => {
    expect(isTodayTaskDone("completed")).toBe(true);
    expect(isTodayTaskDone("pending_review")).toBe(true);
    expect(isTodayTaskDone("in_progress")).toBe(false);
    expect(isTodayTaskDone("overdue")).toBe(false);
  });
});
