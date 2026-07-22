import { describe, expect, it } from "vitest";
import {
  isManagerNextTask,
  sortEmployeeOpenFocus,
  sortInProgressFocusFirst,
  sortMostOverdueFirst,
} from "./employeeTaskFocus";

describe("sortInProgressFocusFirst", () => {
  it("puts most recently started task first", () => {
    const tasks = [
      { id: "a", due_at: "2026-07-22T08:00:00Z", started_at: "2026-07-22T09:00:00Z" },
      { id: "b", due_at: "2026-07-22T07:00:00Z", started_at: "2026-07-22T10:00:00Z" },
    ];
    expect(sortInProgressFocusFirst(tasks).map((t) => t.id)).toEqual(["b", "a"]);
  });

  it("falls back to earliest due when started_at ties", () => {
    const tasks = [
      { id: "late", due_at: "2026-07-22T12:00:00Z", started_at: "2026-07-22T09:00:00Z" },
      { id: "early", due_at: "2026-07-22T08:00:00Z", started_at: "2026-07-22T09:00:00Z" },
    ];
    expect(sortInProgressFocusFirst(tasks).map((t) => t.id)).toEqual(["early", "late"]);
  });
});

describe("sortMostOverdueFirst", () => {
  it("orders by earliest due_at first", () => {
    const tasks = [
      { id: "c", due_at: "2026-07-22T14:00:00Z" },
      { id: "a", due_at: "2026-07-21T10:00:00Z" },
      { id: "b", due_at: "2026-07-22T08:00:00Z" },
    ];
    expect(sortMostOverdueFirst(tasks).map((t) => t.id)).toEqual(["a", "b", "c"]);
  });

  it("returns empty list unchanged", () => {
    expect(sortMostOverdueFirst([])).toEqual([]);
  });
});

describe("sortEmployeeOpenFocus", () => {
  it("puts manager next first when no in_progress", () => {
    const tasks = [
      { id: "late", due_at: "2026-07-20T08:00:00Z" },
      { id: "next", due_at: "2026-07-22T18:00:00Z", manager_next_at: "2026-07-22T12:00:00Z" },
      { id: "mid", due_at: "2026-07-21T08:00:00Z" },
    ];
    expect(sortEmployeeOpenFocus(tasks, false).map((t) => t.id)).toEqual(["next", "late", "mid"]);
  });

  it("ignores manager next order when has in_progress", () => {
    const tasks = [
      { id: "late", due_at: "2026-07-20T08:00:00Z" },
      { id: "next", due_at: "2026-07-22T18:00:00Z", manager_next_at: "2026-07-22T12:00:00Z" },
    ];
    expect(sortEmployeeOpenFocus(tasks, true).map((t) => t.id)).toEqual(["late", "next"]);
  });

  it("detects manager next via flag", () => {
    expect(isManagerNextTask({ is_manager_next: true })).toBe(true);
    expect(isManagerNextTask({})).toBe(false);
  });
});
