import { describe, expect, it } from "vitest";
import { formatDurationMinutes, uniqueAnomalyCodes } from "./attendanceFormat";

describe("attendanceFormat", () => {
  const labels = { hours: "ש׳", minutes: "ד׳" };

  it("formats hours and leftover minutes", () => {
    expect(formatDurationMinutes(90, labels)).toBe("1ש׳ 30ד׳");
    expect(formatDurationMinutes(60, labels)).toBe("1ש׳");
    expect(formatDurationMinutes(15, labels)).toBe("15ד׳");
  });

  it("returns dash for empty totals", () => {
    expect(formatDurationMinutes(0, labels)).toBe("—");
    expect(formatDurationMinutes(null, labels)).toBe("—");
  });

  it("dedupes anomaly codes", () => {
    expect(
      uniqueAnomalyCodes([
        { code: "idle" },
        { code: "missing_clock_out" },
        { code: "idle" },
      ]),
    ).toEqual(["idle", "missing_clock_out"]);
  });
});
