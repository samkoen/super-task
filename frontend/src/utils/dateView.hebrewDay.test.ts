import { describe, expect, it } from "vitest";
import { formatHebrewDay } from "./dateView";

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
