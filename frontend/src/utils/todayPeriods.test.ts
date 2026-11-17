import { describe, expect, it } from "vitest";
import { groupTodayTasks, isTodayTaskDone, periodForDue } from "./todayPeriods";
import { periodOf } from "./managerHome";
import { greetingFor } from "./flowStack";
import { he } from "../i18n/he";

function at(hour: number, minute = 0): string {
  return new Date(2026, 10, 17, hour, minute).toISOString();
}

describe("todayPeriods", () => {
  it("splits the day at 12:00 and 17:00 (same for oved and menahel)", () => {
    expect(periodForDue(at(7, 30))).toBe("morning");
    expect(periodForDue(at(11, 59))).toBe("morning");
    expect(periodForDue(at(12))).toBe("noon");
    expect(periodForDue(at(16, 59))).toBe("noon");
    expect(periodForDue(at(17))).toBe("evening");
    expect(periodForDue(at(17, 30))).toBe("evening");
    expect(periodForDue("not a date")).toBe("morning");
  });

  it("menahel periodOf and the greeting follow the same thresholds", () => {
    for (const [hour, minute] of [[11, 59], [12, 0], [16, 59], [17, 0], [17, 30], [23, 0]]) {
      expect(periodOf(at(hour, minute))).toBe(periodForDue(at(hour, minute)));
    }
    expect(greetingFor("אבי", new Date(2026, 10, 17, 16, 59))).toBe(he.flowGreetingNoon("אבי"));
    expect(greetingFor("אבי", new Date(2026, 10, 17, 17, 0))).toBe(he.flowGreetingEvening("אבי"));
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
