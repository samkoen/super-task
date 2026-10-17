import { describe, expect, it } from "vitest";
import { formatHebrewDay, formatHebrewDayNoYear } from "./dateView";

describe("formatHebrewDayNoYear", () => {
  it("shows weekday, day and month but no year", () => {
    const label = formatHebrewDayNoYear("2026-10-15");
    expect(label).toContain("15");
    expect(label).not.toContain("2026");
    expect(label).toMatch(/אוקטובר|october/i);
  });
});

describe("formatHebrewDay", () => {
  it("formats a weekday with day month and year in Hebrew", () => {
    const label = formatHebrewDay("2026-08-25");
    expect(label).toContain("25");
    expect(label).toContain("2026");
    expect(label).toMatch(/אוגוסט|august/i);
  });

  it("stays empty of יום/טווח selector wording", () => {
    const label = formatHebrewDay("2026-01-01");
    expect(label).not.toContain("טווח");
  });
});
