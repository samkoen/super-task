import { describe, expect, it } from "vitest";
import { checkVideoLength } from "./flowReview";

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
