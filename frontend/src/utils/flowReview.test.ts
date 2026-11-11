import { describe, expect, it } from "vitest";
import { allChecksPassed, buildReviewChecks, canSendReview, checkVideoLength, formatClockTime } from "./flowReview";
import { he } from "../i18n/he";

describe("checkVideoLength", () => {
  it("accepts a video that reaches the minimum set by the menahel", () => {
    expect(checkVideoLength(12, 10)).toEqual({ ok: true, seconds: 12, min: 10 });
  });

  it("accepts exactly the minimum", () => {
    expect(checkVideoLength(10, 10).ok).toBe(true);
  });

  it("refuses a video shorter than the minimum", () => {
    expect(checkVideoLength(4.4, 10)).toEqual({ ok: false, seconds: 4, min: 10 });
  });

  it("accepts any length when no minimum is configured", () => {
    expect(checkVideoLength(1, null).ok).toBe(true);
    expect(checkVideoLength(undefined, 0).ok).toBe(true);
  });
});

describe("formatClockTime", () => {
  it("formats local hours and minutes with two digits", () => {
    const iso = new Date(2026, 10, 10, 6, 5).toISOString();
    expect(formatClockTime(iso)).toBe("06:05");
  });

  it("returns an empty string for missing or invalid dates", () => {
    expect(formatClockTime(null)).toBe("");
    expect(formatClockTime("not a date")).toBe("");
  });
});

describe("buildReviewChecks", () => {
  const capturedAt = new Date(2026, 10, 10, 6, 42).toISOString();

  it("lists length, light and shot rows like the Figma", () => {
    const checks = buildReviewChecks({ durationSeconds: 38, minSeconds: 10, lightOk: true, branch: "510", capturedAt });
    expect(checks.map((check) => check.id)).toEqual(["length", "light", "shot"]);
    expect(checks[0].text).toBe(he.flowReviewLengthOk(38));
    expect(checks[1].text).toBe(he.flowReviewLightOk);
    expect(checks[2].text).toBe(he.flowReviewShot("510", "06:42"));
    expect(allChecksPassed(checks)).toBe(true);
  });

  it("blocks sending only when the length is not respected", () => {
    const short = buildReviewChecks({ durationSeconds: 3, minSeconds: 10, lightOk: true, capturedAt });
    expect(canSendReview(short)).toBe(false);
    expect(allChecksPassed(short)).toBe(false);
  });

  it("warns about low light without blocking", () => {
    const dark = buildReviewChecks({ durationSeconds: 20, minSeconds: 10, lightOk: false, capturedAt });
    expect(dark[1].ok).toBe(false);
    expect(canSendReview(dark)).toBe(true);
    expect(allChecksPassed(dark)).toBe(false);
  });

  describe("GPS check", () => {
    const base = { durationSeconds: 20, minSeconds: 10, lightOk: true, branch: "510", capturedAt };
    const center = { lat: 31.77, lng: 35.21 };
    const shot = (extra: object) => buildReviewChecks({ ...base, ...extra })[2];

    it("claims the branch only when the position is verified inside it", () => {
      const check = shot({ branchCenter: center, location: { lat: 31.7702, lng: 35.21, accuracy: 10 } });
      expect(check.ok).toBe(true);
      expect(check.text).toBe(he.flowReviewShot("510", "06:42"));
    });

    it("warns, without blocking, when filmed away from the branch", () => {
      const checks = buildReviewChecks({ ...base, branchCenter: center, location: { lat: 32.5, lng: 35.21 } });
      expect(checks[2].ok).toBe(false);
      expect(checks[2].text).toBe(he.flowReviewAwayFromBranch("06:42"));
      expect(canSendReview(checks)).toBe(true);
    });

    it("shows only the time when the branch has coordinates but the GPS was refused", () => {
      expect(shot({ branchCenter: center, location: null }).text).toBe(he.flowReviewShot(null, "06:42"));
    });

    it("keeps the branch name when the branch has no coordinates", () => {
      expect(shot({ branchCenter: null, location: { lat: 1, lng: 1 } }).text).toBe(he.flowReviewShot("510", "06:42"));
    });
  });

  it("omits the light row when it could not be measured and the branch when unknown", () => {
    const checks = buildReviewChecks({ durationSeconds: 20, minSeconds: null, lightOk: null, capturedAt });
    expect(checks.map((check) => check.id)).toEqual(["length", "shot"]);
    expect(checks[1].text).toBe(he.flowReviewShot(null, "06:42"));
  });
});
