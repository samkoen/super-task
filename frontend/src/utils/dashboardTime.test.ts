import { describe, expect, it } from "vitest";
import { formatDurationMinutes, formatTime } from "./dashboardTime";

describe("dashboardTime", () => {
  it("formatTime returns dash for empty", () => {
    expect(formatTime(null)).toBe("—");
  });

  it("formatDurationMinutes under one hour", () => {
    expect(formatDurationMinutes(45)).toBe("45 דק'");
  });

  it("formatDurationMinutes with hours", () => {
    expect(formatDurationMinutes(90)).toBe("1 ש' 30 דק'");
  });
});
