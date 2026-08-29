import { describe, expect, it } from "vitest";
import { he } from "../i18n/he";
import { formatBreakElapsed, parseRecipientBreak } from "./breakAlert";

describe("parseRecipientBreak", () => {
  it("reads a manager send payload", () => {
    const parsed = parseRecipientBreak({
      recipient_user_id: "e1",
      recipient_break: {
        on_break: true,
        on_break_since: "2026-08-28T10:00:00+03:00",
        elapsed_seconds: 900,
      },
    });
    expect(parsed?.userId).toBe("e1");
    expect(parsed?.alert.elapsed_seconds).toBe(900);
  });

  it("ignores an empty or employee payload", () => {
    expect(parseRecipientBreak({})).toBeNull();
    expect(parseRecipientBreak({ recipient_break: { on_break: true } })).toBeNull();
    expect(parseRecipientBreak(null)).toBeNull();
  });
});

describe("formatBreakElapsed", () => {
  it("shows less than a minute then a duration", () => {
    expect(formatBreakElapsed(30)).toBe(he.breakAlertLessThanMinute);
    expect(formatBreakElapsed(900)).toBe("15 דק'");
  });
});
