import { describe, expect, it, vi } from "vitest";
import { scheduleConfirmCompletionMedia } from "./confirmCompletionMedia";

const R2_VIDEO = "https://abc.r2.cloudflarestorage.com/super-media/v.mp4";

describe("scheduleConfirmCompletionMedia", () => {
  it("does nothing when the attachment list is empty", () => {
    const confirm = vi.fn();
    const isReady = vi.fn();
    scheduleConfirmCompletionMedia("occ-1", [], confirm, isReady);
    expect(confirm).not.toHaveBeenCalled();
    expect(isReady).not.toHaveBeenCalled();
  });

  it("does nothing when there is no remote object-store video", () => {
    const confirm = vi.fn();
    const isReady = vi.fn();
    scheduleConfirmCompletionMedia(
      "occ-1",
      [{ kind: "video", url: "/uploads/v.mp4" }],
      confirm,
      isReady,
    );
    expect(confirm).not.toHaveBeenCalled();
    expect(isReady).not.toHaveBeenCalled();
  });

  it("does nothing for retired Vercel Blob URLs", () => {
    const confirm = vi.fn();
    const isReady = vi.fn();
    scheduleConfirmCompletionMedia(
      "occ-1",
      [{ kind: "video", url: "https://x.private.blob.vercel-storage.com/v.mp4" }],
      confirm,
      isReady,
    );
    expect(confirm).not.toHaveBeenCalled();
    expect(isReady).not.toHaveBeenCalled();
  });

  it("confirms after every R2 video is already ready", async () => {
    const confirm = vi.fn().mockResolvedValue({ media_ready: true });
    const isReady = vi.fn().mockResolvedValue(true);
    scheduleConfirmCompletionMedia(
      "occ-1",
      [{ kind: "video", url: R2_VIDEO }],
      confirm,
      isReady,
    );
    await vi.waitFor(() => {
      expect(isReady).toHaveBeenCalledWith(R2_VIDEO);
      expect(confirm).toHaveBeenCalledWith("occ-1");
    });
  });
});
