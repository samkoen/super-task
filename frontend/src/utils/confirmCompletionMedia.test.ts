import { describe, expect, it, vi } from "vitest";
import { scheduleConfirmCompletionMedia } from "./confirmCompletionMedia";

describe("scheduleConfirmCompletionMedia", () => {
  it("does nothing when there is no remote video", () => {
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

  it("confirms after every blob video becomes ready", async () => {
    const confirm = vi.fn().mockResolvedValue({ media_ready: true });
    const isReady = vi.fn().mockResolvedValue(true);
    scheduleConfirmCompletionMedia(
      "occ-1",
      [{ kind: "video", url: "https://x.private.blob.vercel-storage.com/v.mp4" }],
      confirm,
      isReady,
    );
    await vi.waitFor(() => {
      expect(isReady).toHaveBeenCalled();
      expect(confirm).toHaveBeenCalledWith("occ-1");
    });
  });
});
