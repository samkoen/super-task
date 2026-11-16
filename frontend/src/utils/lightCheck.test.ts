import { describe, expect, it } from "vitest";
import { MIN_AVERAGE_LUMA, lightEnough, meanLuma } from "./lightCheck";

describe("lightCheck", () => {
  it("measures black, white and an empty buffer", () => {
    expect(meanLuma(new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 255]))).toBe(0);
    expect(meanLuma(new Uint8ClampedArray([255, 255, 255, 255]))).toBeCloseTo(255, 3);
    expect(meanLuma(new Uint8ClampedArray([]))).toBe(0);
  });

  it("judges the average of the samples", () => {
    expect(lightEnough([MIN_AVERAGE_LUMA + 10, MIN_AVERAGE_LUMA + 20])).toBe(true);
    expect(lightEnough([5, 10, 20])).toBe(false);
  });

  it("returns null when nothing was measured", () => {
    expect(lightEnough([])).toBeNull();
  });
});
