import { describe, expect, it } from "vitest";
import { datetimeLocalForDay, datetimeLocalForNewTask } from "./dateView";

describe("datetimeLocalForNewTask", () => {
  it("defaults due time 15 minutes after reference", () => {
    const ref = new Date(2026, 6, 20, 14, 0, 0);
    expect(datetimeLocalForNewTask("2026-07-20", ref)).toBe("2026-07-20T14:15");
    expect(datetimeLocalForDay("2026-07-20", ref, 0)).toBe("2026-07-20T14:00");
  });
});
