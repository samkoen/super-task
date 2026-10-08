import { describe, expect, it } from "vitest";
import { stepCaption } from "./CaptureStepCard";
import { he } from "../../i18n/he";

describe("stepCaption", () => {
  it("shows done for a finished step whatever its kind", () => {
    expect(stepCaption({ kind: "video", min_seconds: 10 }, "done")).toBe(he.completionSlotDone);
  });

  it("flags the next step and keeps the minimum duration of a video", () => {
    expect(stepCaption({ kind: "video", min_seconds: 15 }, "next")).toBe(
      `${he.captureStepNext} · ${he.completionSlotVideoMin(15)}`,
    );
    expect(stepCaption({ kind: "photo" }, "next")).toBe(he.captureStepNext);
  });

  it("falls back to 10 seconds for a video without a minimum", () => {
    expect(stepCaption({ kind: "video" }, "todo")).toBe(he.completionSlotVideoMin(10));
  });

  it("stays empty for a later photo step", () => {
    expect(stepCaption({ kind: "photo" }, "todo")).toBe("");
  });
});
