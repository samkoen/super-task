import { describe, expect, it } from "vitest";
import {
  FLOW_VIDEO_MAX_SECONDS,
  RING_CIRCUMFERENCE,
  durationLine,
  flowMaxSeconds,
  recordRing,
  shouldAutoStop,
} from "./flowCamera";

const text = { between: (a: number, b: number) => `${a}-${b}`, upTo: (b: number) => `max ${b}` };

describe("flowCamera", () => {
  it("uses 60 seconds unless the menahel asks for more", () => {
    expect(flowMaxSeconds(null)).toBe(FLOW_VIDEO_MAX_SECONDS);
    expect(flowMaxSeconds(10)).toBe(60);
    expect(flowMaxSeconds(120)).toBe(120);
  });

  it("places the minimum marker like the Figma (10 s of 60 s = 60°)", () => {
    const ring = recordRing(0, 10);
    expect(ring.marker?.x).toBeCloseTo(72.5626, 2);
    expect(ring.marker?.y).toBeCloseTo(21.2, 2);
    expect(ring.minReached).toBe(false);
  });

  it("fills the arc with the elapsed time and reports the minimum", () => {
    const ring = recordRing(30, 10);
    expect(ring.arcLength).toBeCloseTo(RING_CIRCUMFERENCE / 2, 5);
    expect(ring.minReached).toBe(true);
  });

  it("has no marker without a minimum, and never overflows the ring", () => {
    const ring = recordRing(500, null);
    expect(ring.marker).toBeNull();
    expect(ring.arcLength).toBeCloseTo(RING_CIRCUMFERENCE, 5);
    expect(ring.minReached).toBe(true);
  });

  it("stops by itself at the maximum", () => {
    expect(shouldAutoStop(59, 10)).toBe(false);
    expect(shouldAutoStop(60, 10)).toBe(true);
    expect(shouldAutoStop(60, 90)).toBe(false);
  });

  it("builds the duration line", () => {
    expect(durationLine(10, text)).toBe("10-60");
    expect(durationLine(null, text)).toBe("max 60");
  });
});
