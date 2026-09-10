import { describe, expect, it } from "vitest";
import { DEFAULT_REVIEW_QUALITY_RATING, formatQualityAverage, hasQualityRatings } from "./qualityRating";

describe("qualityRating", () => {
  it("formats one decimal", () => {
    expect(formatQualityAverage(4)).toBe("4.0");
    expect(formatQualityAverage(4.25)).toBe("4.3");
  });

  it("defaults menahel review to four stars", () => {
    expect(DEFAULT_REVIEW_QUALITY_RATING).toBe(4);
  });

  it("treats empty history as no ratings", () => {
    expect(hasQualityRatings({ average: null, count: 0, by_category: [] })).toBe(false);
    expect(hasQualityRatings({ average: 4.5, count: 2, by_category: [] })).toBe(true);
  });
});
