import { describe, expect, it } from "vitest";
import { formatClockTime } from "./clockTime";

describe("formatClockTime", () => {
  it("pads hours and minutes", () => {
    expect(formatClockTime(new Date(2026, 9, 15, 7, 8))).toBe("07:08");
  });

  it("uses a 24 hour clock", () => {
    expect(formatClockTime(new Date(2026, 9, 15, 23, 59))).toBe("23:59");
    expect(formatClockTime(new Date(2026, 9, 15, 0, 0))).toBe("00:00");
  });
});
