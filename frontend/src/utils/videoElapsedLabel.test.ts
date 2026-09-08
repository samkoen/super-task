import { describe, expect, it } from "vitest";
import { videoElapsedLabel } from "./videoElapsedLabel";

describe("videoElapsedLabel", () => {
  it("shows elapsed / required seconds when a minimum exists", () => {
    expect(videoElapsedLabel(1, 5)).toBe("1 / 5");
    expect(videoElapsedLabel(2, 5)).toBe("2 / 5");
    expect(videoElapsedLabel(5, 5)).toBe("5 / 5");
  });

  it("shows only elapsed seconds when there is no minimum", () => {
    expect(videoElapsedLabel(2, null)).toBe("2");
    expect(videoElapsedLabel(2, 0)).toBe("2");
    expect(videoElapsedLabel(-1, null)).toBe("0");
  });
});
