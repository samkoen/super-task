import { describe, expect, it } from "vitest";
import { he } from "../../i18n/he";
import { shiftStatusLabel } from "./employeeShiftStatus";

describe("shiftStatusLabel", () => {
  it("prefers break over shift", () => {
    expect(shiftStatusLabel(true, true)).toBe(he.employeeOnBreak);
    expect(shiftStatusLabel(false, true)).toBe(he.employeeOnShift);
    expect(shiftStatusLabel(false, false)).toBe(he.employeeOffShift);
  });
});
