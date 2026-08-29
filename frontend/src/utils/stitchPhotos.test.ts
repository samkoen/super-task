import { describe, expect, it } from "vitest";
import { computeStitchSize } from "./stitchPhotos";

describe("computeStitchSize", () => {
  it("keeps the taller side and scales the other", () => {
    const size = computeStitchSize({ width: 100, height: 50 }, { width: 80, height: 80 });
    expect(size.height).toBe(80);
    expect(size.leftW).toBe(160);
    expect(size.rightW).toBe(80);
    expect(size.width).toBe(240);
  });
});
