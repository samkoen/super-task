import { describe, expect, it } from "vitest";
import { formatDueAt } from "./dateView";

describe("formatDueAt", () => {
  it("shows only time without seconds when due is today", () => {
    const now = new Date(2026, 6, 16, 12, 0, 0);
    const formatted = formatDueAt("2026-07-16T09:30:45", now);
    expect(formatted).toMatch(/09:30|9:30/);
    expect(formatted).not.toMatch(/45/);
    expect(formatted).not.toMatch(/16/);
  });

  it("shows date and time without seconds when due is another day", () => {
    const now = new Date(2026, 6, 16, 12, 0, 0);
    const formatted = formatDueAt("2026-07-17T14:05:59", now);
    expect(formatted).toMatch(/14:05|2:05/);
    expect(formatted).not.toMatch(/59/);
    expect(formatted.length).toBeGreaterThan(5);
  });
});
