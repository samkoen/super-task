import { describe, expect, it } from "vitest";
import { he } from "../i18n/he";
import {
  ALL_WEEKDAYS,
  DAILY_DEFAULT_WEEKDAYS,
  FIXED_RECURRENCE_OPTIONS,
  WEEKDAY_OPTIONS,
  defaultWeeklyDays,
  formatWeekdaysPart,
  initialWeeklyDays,
  joinWeeklyDays,
  normalizeFixedRecurrence,
  parseWeeklyDays,
  usesWeeklyDays,
  weekdaysForPicker,
  weekdaysOnRecurrenceChange,
  weeklyDaysPayload,
} from "./taskRecurrence";

describe("taskRecurrence", () => {
  it("drops biweekly from new fixed options", () => {
    expect(FIXED_RECURRENCE_OPTIONS).toEqual(["daily", "weekly", "monthly"]);
  });

  it("lists weekdays from Sunday", () => {
    expect(WEEKDAY_OPTIONS[0]).toEqual({ value: "6", label: he.weekdaySun });
    expect(WEEKDAY_OPTIONS[WEEKDAY_OPTIONS.length - 1].value).toBe("5");
  });

  it("defaults daily to every day except Saturday", () => {
    expect(DAILY_DEFAULT_WEEKDAYS).toBe("6,0,1,2,3,4");
    expect(DAILY_DEFAULT_WEEKDAYS.includes("5")).toBe(false);
    expect(defaultWeeklyDays("daily")).toBe(DAILY_DEFAULT_WEEKDAYS);
    expect(defaultWeeklyDays("weekly")).toBe("6");
  });

  it("parses and joins weekday csv in Sunday-first order", () => {
    expect(parseWeeklyDays("0, 4,9")).toEqual(["0", "4"]);
    expect(joinWeeklyDays(["4", "0", "0", "6"])).toBe("6,0,4");
  });

  it("shows all days in the picker when none stored (legacy daily)", () => {
    expect(weekdaysForPicker(null).join(",")).toBe(ALL_WEEKDAYS);
  });

  it("prefills stored days or the daily/weekly default", () => {
    expect(initialWeeklyDays("daily", null)).toBe(DAILY_DEFAULT_WEEKDAYS);
    expect(initialWeeklyDays("weekly", "0,1")).toBe("0");
    expect(initialWeeklyDays("daily", "0,4")).toBe("0,4");
  });

  it("collapses to one day when switching to weekly", () => {
    expect(weekdaysOnRecurrenceChange("weekly", "6,0,1")).toBe("6");
    expect(weekdaysOnRecurrenceChange("daily", "6")).toBe(DAILY_DEFAULT_WEEKDAYS);
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

  it("formats a weekday subset from Sunday", () => {
    expect(formatWeekdaysPart("0,6")).toBe(`${he.weekdaySun}, ${he.weekdayMon}`);
    expect(formatWeekdaysPart(ALL_WEEKDAYS)).toBe("");
  });
});
