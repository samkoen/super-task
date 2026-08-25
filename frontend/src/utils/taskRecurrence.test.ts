import { describe, expect, it } from "vitest";
import { he } from "../i18n/he";
import {
  ALL_WEEKDAYS,
  FIXED_RECURRENCE_OPTIONS,
  formatWeekdaysPart,
  joinWeeklyDays,
  normalizeFixedRecurrence,
  parseWeeklyDays,
  usesWeeklyDays,
  weekdaysForPicker,
  weeklyDaysPayload,
} from "./taskRecurrence";

describe("taskRecurrence", () => {
  it("drops biweekly from new fixed options", () => {
    expect(FIXED_RECURRENCE_OPTIONS).toEqual(["daily", "weekly", "monthly"]);
  });

  it("parses and joins weekday csv", () => {
    expect(parseWeeklyDays("0, 4,9")).toEqual(["0", "4"]);
    expect(joinWeeklyDays(["4", "0", "0"])).toBe("0,4");
  });

  it("shows all days in the picker when none stored (legacy daily)", () => {
    expect(weekdaysForPicker(null).join(",")).toBe(ALL_WEEKDAYS);
  });

  it("sends weekdays for daily and weekly only", () => {
    expect(weeklyDaysPayload("daily", "0,1,2")).toBe("0,1,2");
    expect(weeklyDaysPayload("weekly", "4")).toBe("4");
    expect(weeklyDaysPayload("monthly", "4")).toBeUndefined();
    expect(usesWeeklyDays("daily")).toBe(true);
  });

  it("maps legacy biweekly to weekly", () => {
    expect(normalizeFixedRecurrence("biweekly")).toBe("weekly");
    expect(normalizeFixedRecurrence("daily")).toBe("daily");
  });

  it("formats a weekday subset", () => {
    expect(formatWeekdaysPart("0,1")).toBe(`${he.weekdayMon}, ${he.weekdayTue}`);
    expect(formatWeekdaysPart(ALL_WEEKDAYS)).toBe("");
  });
});
