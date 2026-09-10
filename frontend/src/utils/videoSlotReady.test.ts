import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isVideoPending,
  pendingVideoSlots,
  releaseVideoElement,
  waitUntilPendingVideosReady,
} from "./videoSlotReady";

describe("videoSlotReady", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("detects video slots and ignores photos", () => {
    const video = {
      file: new File(["x"], "clip.webm", { type: "video/webm" }),
      previewUrl: "blob:video",
    };
    const photo = {
      file: new File(["x"], "a.jpg", { type: "image/jpeg" }),
      previewUrl: "blob:photo",
    };
    expect(isVideoPending(video)).toBe(true);
    expect(isVideoPending(photo)).toBe(false);
    expect(pendingVideoSlots([photo, video, null])).toEqual([video]);
  });

  it("waits for capture UI idle and preview canplay before completing", async () => {
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    const wait = vi.fn(async () => undefined);
    const canPlay = vi.fn(async () => undefined);
    const video = {
      file: new File(["x"], "a.mp4", { type: "video/mp4" }),
      previewUrl: "blob:ready",
    };
    await waitUntilPendingVideosReady([video], { idleMs: 50, wait, canPlay });
    expect(wait).toHaveBeenCalledWith(50);
    expect(canPlay).toHaveBeenCalledWith("blob:ready");
  });

  it("releases a probe video without load() so the blob stays readable", () => {
    const video = {
      onloadeddata: 1,
      onerror: 1,
      removeAttribute: vi.fn(),
      remove: vi.fn(),
      load: vi.fn(),
    };
    releaseVideoElement(video as unknown as HTMLVideoElement);
    expect(video.load).not.toHaveBeenCalled();
    expect(video.removeAttribute).toHaveBeenCalledWith("src");
    expect(video.remove).toHaveBeenCalled();
  });

  it("does not wait when there is no video slot", async () => {
    const canPlay = vi.fn();
    await waitUntilPendingVideosReady(
      [{ file: new File(["x"], "a.jpg", { type: "image/jpeg" }), previewUrl: "blob:p" }],
      { canPlay },
    );
    expect(canPlay).not.toHaveBeenCalled();
  });
});
