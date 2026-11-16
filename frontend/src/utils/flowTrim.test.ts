import { describe, expect, it } from "vitest";
import {
  fullRange,
  handleRatio,
  isTrimmed,
  keptSeconds,
  MIN_TRIM_SECONDS,
  moveHandle,
  nearestHandle,
  playbackWindowStep,
} from "./flowTrim";

describe("fullRange / isTrimmed", () => {
  it("starts on the whole video, which is not a trim", () => {
    const range = fullRange(38);
    expect(range).toEqual({ start: 0, end: 38 });
    expect(isTrimmed(range, 38)).toBe(false);
  });

  it("is trimmed as soon as one end moves", () => {
    expect(isTrimmed({ start: 2, end: 38 }, 38)).toBe(true);
    expect(isTrimmed({ start: 0, end: 30 }, 38)).toBe(true);
  });

  it("ignores a negative total", () => {
    expect(fullRange(-3)).toEqual({ start: 0, end: 0 });
  });
});

describe("nearestHandle", () => {
  it("picks the handle closest to the touch", () => {
    const range = { start: 5, end: 30 };
    expect(nearestHandle(range, 8)).toBe("start");
    expect(nearestHandle(range, 25)).toBe("end");
  });
});

describe("moveHandle", () => {
  const range = { start: 5, end: 30 };

  it("moves the start inside the video", () => {
    expect(moveHandle(range, "start", 10, 38)).toEqual({ start: 10, end: 30 });
  });

  it("never lets the start pass the end minus the minimal gap", () => {
    expect(moveHandle(range, "start", 35, 38)).toEqual({ start: 30 - MIN_TRIM_SECONDS, end: 30 });
  });

  it("never lets the end go before the start plus the minimal gap", () => {
    expect(moveHandle(range, "end", 1, 38)).toEqual({ start: 5, end: 5 + MIN_TRIM_SECONDS });
  });

  it("clamps to the video bounds and ignores NaN", () => {
    expect(moveHandle(range, "start", -4, 38).start).toBe(0);
    expect(moveHandle(range, "end", 99, 38).end).toBe(38);
    expect(moveHandle(range, "start", Number.NaN, 38).start).toBe(0);
  });

  it("copes with a video shorter than the minimal gap", () => {
    expect(moveHandle({ start: 0, end: 0.5 }, "end", 0.2, 0.5)).toEqual({ start: 0, end: 0.5 });
  });
});

describe("keptSeconds / handleRatio", () => {
  it("rounds the kept duration", () => {
    expect(keptSeconds({ start: 2, end: 10.4 })).toBe(8);
  });

  it("is a 0..1 fraction of the bar, 0 without a total", () => {
    expect(handleRatio(19, 38)).toBe(0.5);
    expect(handleRatio(5, 0)).toBe(0);
    expect(handleRatio(99, 38)).toBe(1);
  });
});

describe("playbackWindowStep", () => {
  const range = { start: 5, end: 30 };

  it("keeps playing inside the selection", () => {
    expect(playbackWindowStep(12, range)).toBe("play");
  });

  it("restarts at the end of the selection or when outside of it", () => {
    expect(playbackWindowStep(30, range)).toBe("restart");
    expect(playbackWindowStep(2, range)).toBe("restart");
  });
});
