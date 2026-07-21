import { describe, expect, it } from "vitest";
import { hasDeferredTaskMedia, taskHasOpenableReferenceMedia, taskMediaFlags } from "./taskListMedia";

describe("taskListMedia", () => {
  it("detects only background photo as non-deferred heavy media", () => {
    expect(
      hasDeferredTaskMedia({
        reference_photo_url: "https://x/a.jpg",
        reference_video_url: null,
        reference_audio_url: null,
      })
    ).toBe(false);
    expect(taskMediaFlags({ reference_photo_url: "https://x/a.jpg" }).hasReferencePhoto).toBe(true);
  });

  it("flags video/audio/completion as deferred", () => {
    expect(
      hasDeferredTaskMedia({
        reference_photo_url: "https://x/a.jpg",
        reference_video_url: "https://x/a.mp4",
      })
    ).toBe(true);
    expect(
      hasDeferredTaskMedia({
        completion: { photo_path: "/uploads/x.jpg", video_path: null, audio_path: null },
      })
    ).toBe(true);
  });

  it("taskHasOpenableReferenceMedia includes photo video audio", () => {
    expect(taskHasOpenableReferenceMedia({ reference_photo_url: "https://x/a.jpg" })).toBe(true);
    expect(taskHasOpenableReferenceMedia({ reference_video_url: "https://x/a.mp4" })).toBe(true);
    expect(taskHasOpenableReferenceMedia({})).toBe(false);
  });
});
