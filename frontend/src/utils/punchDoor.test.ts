import { describe, expect, it } from "vitest";
import {
  excludeAttendancePunch,
  findOpenPunchTask,
  isPunchDue,
  shouldShowEndDoor,
} from "./punchDoor";

function punch(
  id: string,
  over: {
    status?: string;
    due_at?: string;
    is_work_start?: boolean;
    is_work_end?: boolean;
  } = {},
) {
  return {
    id,
    status: over.status ?? "pending",
    due_at: over.due_at ?? "2026-09-02T17:00:00+03:00",
    is_work_start: over.is_work_start,
    is_work_end: over.is_work_end,
  };
}

describe("punchDoor", () => {
  it("hides punch tasks from the regular lists", () => {
    const start = punch("s", { is_work_start: true });
    const end = punch("e", { is_work_end: true });
    const shelf = punch("t");
    expect(excludeAttendancePunch([start, shelf, end]).map((t) => t.id)).toEqual(["t"]);
  });

  it("finds the open start punch and ignores a closed one", () => {
    expect(
      findOpenPunchTask(
        [punch("old", { is_work_start: true, status: "pending_review" }), punch("now", { is_work_start: true })],
        "start",
      )?.id,
    ).toBe("now");
    expect(findOpenPunchTask([punch("done", { is_work_end: true, status: "completed" })], "end")).toBeNull();
  });

  it("treats due_at in the past as due", () => {
    const now = new Date("2026-09-02T17:00:00+03:00");
    expect(isPunchDue("2026-09-02T17:00:00+03:00", now)).toBe(true);
    expect(isPunchDue("2026-09-02T17:01:00+03:00", now)).toBe(false);
  });

  it("opens the end door at due time unless a task dialog is open", () => {
    const end = punch("e", { is_work_end: true });
    expect(
      shouldShowEndDoor({ startOpen: false, end, inTask: false, due: true, requested: false, dismissed: false }),
    ).toBe(true);
    expect(
      shouldShowEndDoor({ startOpen: false, end, inTask: true, due: true, requested: false, dismissed: false }),
    ).toBe(false);
  });

  it("lets the oved open the end door early and hide it again", () => {
    const end = punch("e", { is_work_end: true });
    expect(
      shouldShowEndDoor({ startOpen: false, end, inTask: false, due: false, requested: true, dismissed: false }),
    ).toBe(true);
    expect(
      shouldShowEndDoor({ startOpen: false, end, inTask: false, due: true, requested: false, dismissed: true }),
    ).toBe(false);
  });

  it("keeps the start door exclusive", () => {
    const end = punch("e", { is_work_end: true });
    expect(
      shouldShowEndDoor({ startOpen: true, end, inTask: false, due: true, requested: true, dismissed: false }),
    ).toBe(false);
  });
});
