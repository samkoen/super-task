import { describe, expect, it } from "vitest";
import { orderTimelineTasks, timelineTimeLabel } from "./employeeTimeline";

const t = (id: string, due_at: string) => ({ id, due_at });

describe("orderTimelineTasks", () => {
  it("puts the next task first, then the rest by time", () => {
    const entries = orderTimelineTasks(
      {
        routine: [t("r2", "2026-10-15T12:00:00+03:00"), t("r1", "2026-10-15T09:00:00+03:00")],
        dynamic: [t("d1", "2026-10-15T10:00:00+03:00")],
      },
      t("d1", "2026-10-15T10:00:00+03:00"),
    );
    expect(entries.map((e) => e.task.id)).toEqual(["d1", "r1", "r2"]);
    expect(entries[0]).toMatchObject({ isNext: true, isDynamic: true });
    expect(entries[1]).toMatchObject({ isNext: false, isDynamic: false });
  });

  it("flags dynamic tasks and sorts unreadable dates last", () => {
    const entries = orderTimelineTasks(
      { routine: [t("bad", "n/a")], dynamic: [t("d", "2026-10-15T08:00:00+03:00")] },
      null,
    );
    expect(entries.map((e) => e.task.id)).toEqual(["d", "bad"]);
    expect(entries[0].isDynamic).toBe(true);
  });

  it("returns an empty list when there is nothing to do", () => {
    expect(orderTimelineTasks({ routine: [], dynamic: [] }, null)).toEqual([]);
  });
});

describe("timelineTimeLabel", () => {
  it("formats a due date as HH:MM", () => {
    const date = new Date(2026, 9, 15, 7, 5, 0);
    expect(timelineTimeLabel(date.toISOString())).toBe("07:05");
  });

  it("returns an empty string for an invalid date", () => {
    expect(timelineTimeLabel("n/a")).toBe("");
  });
});
