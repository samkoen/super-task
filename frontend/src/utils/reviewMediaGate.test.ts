import { describe, expect, it } from "vitest";
import {
  completionHasVideo,
  initialReviewMediaReady,
  reviewActionsBlocked,
} from "./reviewMediaGate";

describe("reviewMediaGate", () => {
  it("blocks review actions until media is ready", () => {
    expect(reviewActionsBlocked({ isReview: true, mediaReady: false })).toBe(true);
    expect(reviewActionsBlocked({ isReview: true, mediaReady: true })).toBe(false);
    expect(reviewActionsBlocked({ isReview: false, mediaReady: false })).toBe(false);
  });

  it("treats a missing flag as already ready", () => {
    expect(initialReviewMediaReady(undefined)).toBe(true);
    expect(initialReviewMediaReady(false)).toBe(false);
  });

  it("detects a video on attachments or the legacy path", () => {
    expect(completionHasVideo([{ kind: "photo", url: "/p.jpg" }])).toBe(false);
    expect(completionHasVideo([{ kind: "video", url: "/v.mp4" }])).toBe(true);
    expect(completionHasVideo([], "/legacy.mp4")).toBe(true);
  });
});
