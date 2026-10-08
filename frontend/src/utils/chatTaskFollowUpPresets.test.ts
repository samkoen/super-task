import { describe, expect, it } from "vitest";
import { followUpPresets, formatFollowUpPreview } from "./chatTaskFollowUp";

describe("followUpPresets", () => {
  const now = new Date(2026, 9, 8, 14, 30);

  it("offers in one hour, tomorrow at 09:00 and in seven days at 09:00", () => {
    const [hour, tomorrow, week] = followUpPresets(now);
    expect(hour).toEqual({ key: "hour", value: "2026-10-08T15:30" });
    expect(tomorrow).toEqual({ key: "tomorrow", value: "2026-10-09T09:00" });
    expect(week).toEqual({ key: "week", value: "2026-10-15T09:00" });
  });

  it("rolls over month ends correctly", () => {
    const [, tomorrow, week] = followUpPresets(new Date(2026, 9, 31, 23, 0));
    expect(tomorrow.value).toBe("2026-11-01T09:00");
    expect(week.value).toBe("2026-11-07T09:00");
  });
});

describe("formatFollowUpPreview", () => {
  it("returns a readable date with the time", () => {
    const text = formatFollowUpPreview("2026-10-09T09:00");
    expect(text).toContain("09:00");
    expect(text).toContain(" · ");
  });

  it("returns an empty string for an empty or invalid value", () => {
    expect(formatFollowUpPreview("")).toBe("");
    expect(formatFollowUpPreview("not-a-date")).toBe("");
  });
});
