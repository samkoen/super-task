import { describe, expect, it } from "vitest";
import {
  captureProgress,
  formatRecordingClock,
  videoRecordingProgress,
} from "./captureProgress";
import type { CompletionRequirement } from "./completionMedia";
import type { PendingMedia } from "./pendingMedia";

const reqs: CompletionRequirement[] = [
  { kind: "photo", title: "א" },
  { kind: "video", title: "ב", min_seconds: 10 },
  { kind: "message", title: "ג" },
];

function kept(url = "/x.jpg"): PendingMedia {
  return { file: null, previewUrl: "", capturedAt: "", keptUrl: url };
}

describe("captureProgress", () => {
  it("marks the first missing step as next and the rest as todo", () => {
    const result = captureProgress(reqs, [kept(), null, null]);
    expect(result.states).toEqual(["done", "next", "todo"]);
    expect(result.done).toBe(1);
    expect(result.total).toBe(3);
    expect(result.remaining).toBe(2);
    expect(result.nextIndex).toBe(1);
  });

  it("highlights an earlier gap even when a later step is already filled", () => {
    const result = captureProgress(reqs, [null, kept("/v.mp4"), null]);
    expect(result.states).toEqual(["next", "done", "todo"]);
  });

  it("counts a written message as done", () => {
    const text: PendingMedia = { file: null, previewUrl: "", capturedAt: "", text: "הכל תקין" };
    const result = captureProgress(reqs, [kept(), kept("/v.mp4"), text]);
    expect(result.states).toEqual(["done", "done", "done"]);
    expect(result.nextIndex).toBe(-1);
    expect(result.remaining).toBe(0);
  });

  it("ignores a blank message and missing slots", () => {
    const blank: PendingMedia = { file: null, previewUrl: "", capturedAt: "", text: "   " };
    const result = captureProgress(reqs, [undefined, undefined, blank]);
    expect(result.done).toBe(0);
    expect(result.states).toEqual(["next", "todo", "todo"]);
  });

  it("returns an empty progress without requirements", () => {
    const result = captureProgress([], []);
    expect(result).toEqual({ states: [], done: 0, total: 0, remaining: 0, nextIndex: -1 });
  });
});

describe("videoRecordingProgress", () => {
  it("counts down to the minimum", () => {
    expect(videoRecordingProgress(3, 10)).toEqual({ remaining: 7, ratio: 0.3, reached: false });
  });

  it("is reached once the minimum has passed", () => {
    expect(videoRecordingProgress(12, 10)).toEqual({ remaining: 0, ratio: 1, reached: true });
  });

  it("is always reached without a minimum", () => {
    expect(videoRecordingProgress(0, null).reached).toBe(true);
    expect(videoRecordingProgress(0, 0).ratio).toBe(1);
  });

  it("ignores negative or fractional elapsed values", () => {
    expect(videoRecordingProgress(-4, 10).remaining).toBe(10);
    expect(videoRecordingProgress(2.9, 10).remaining).toBe(8);
  });
});

describe("formatRecordingClock", () => {
  it("formats minutes and seconds", () => {
    expect(formatRecordingClock(0)).toBe("00:00");
    expect(formatRecordingClock(67)).toBe("01:07");
  });

  it("never goes negative", () => {
    expect(formatRecordingClock(-5)).toBe("00:00");
  });
});
