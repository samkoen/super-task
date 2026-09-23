import { describe, expect, it } from "vitest";
import { playableMediaBlob, shouldStreamVideoOnWeb } from "./videoPlayback";

describe("shouldStreamVideoOnWeb", () => {
  it("streams a task video in Chrome", () => {
    expect(shouldStreamVideoOnWeb("/uploads/task_videos/a.mp4", false)).toBe(true);
    expect(
      shouldStreamVideoOnWeb("https://x.r2.cloudflarestorage.com/b/task_videos/a.webm", false),
    ).toBe(true);
  });

  it("keeps the Android proxy path", () => {
    expect(shouldStreamVideoOnWeb("/uploads/task_videos/a.mp4", true)).toBe(false);
    expect(shouldStreamVideoOnWeb("/uploads/p.jpg", false)).toBe(false);
  });
});

describe("playableMediaBlob", () => {
  it("gives Chrome a video mime when the response has none", () => {
    const raw = new Blob(["vid"], { type: "application/octet-stream" });
    const fixed = playableMediaBlob(raw, "/uploads/v.mp4", false);
    expect(fixed.type).toBe("video/mp4");
    expect(fixed).not.toBe(raw);
  });

  it("leaves the Android blob untouched", () => {
    const raw = new Blob(["vid"], { type: "" });
    expect(playableMediaBlob(raw, "/uploads/v.mp4", true)).toBe(raw);
  });
});
