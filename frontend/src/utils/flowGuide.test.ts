import { describe, expect, it } from "vitest";
import { formatClipDuration } from "./flowGuide";

describe("formatClipDuration", () => {
  it("formats minutes and seconds with two digits", () => {
    expect(formatClipDuration(80)).toBe("01:20");
    expect(formatClipDuration(9.4)).toBe("00:09");
    expect(formatClipDuration(3600)).toBe("60:00");
  });

  it("returns an empty string for unknown or invalid durations", () => {
    expect(formatClipDuration(null)).toBe("");
    expect(formatClipDuration(undefined)).toBe("");
    expect(formatClipDuration(0)).toBe("");
    expect(formatClipDuration(Number.NaN)).toBe("");
    expect(formatClipDuration(Number.POSITIVE_INFINITY)).toBe("");
  });
});
