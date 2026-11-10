import { describe, expect, it } from "vitest";
import { clamp01, playbackRatio, playerTotalSeconds, seekRatioFromPointer } from "./flowPlayer";

describe("flowPlayer", () => {
  it("prefers the recorded duration over the media duration", () => {
    expect(playerTotalSeconds(38, 40)).toBe(38);
    expect(playerTotalSeconds(null, 12.5)).toBe(12.5);
  });

  it("ignores the infinite duration of MediaRecorder files", () => {
    expect(playerTotalSeconds(null, Infinity)).toBe(0);
    expect(playerTotalSeconds(0, NaN)).toBe(0);
  });

  it("computes progress and never leaves 0..1", () => {
    expect(playbackRatio(11, 38)).toBeCloseTo(11 / 38);
    expect(playbackRatio(50, 38)).toBe(1);
    expect(playbackRatio(5, 0)).toBe(0);
    expect(clamp01(-3)).toBe(0);
  });

  it("seeks from the right edge (RTL)", () => {
    const rect = { left: 100, width: 200 };
    expect(seekRatioFromPointer(300, rect)).toBe(0);
    expect(seekRatioFromPointer(100, rect)).toBe(1);
    expect(seekRatioFromPointer(200, rect)).toBe(0.5);
    expect(seekRatioFromPointer(900, rect)).toBe(0);
  });
});
