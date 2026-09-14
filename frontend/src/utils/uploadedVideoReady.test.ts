import { describe, expect, it, vi } from "vitest";
import { he } from "../i18n/he";
import { remoteVideoUrls, waitUntilRemoteVideosReady } from "./uploadedVideoReady";

describe("uploadedVideoReady", () => {
  it("only waits for remote object-store videos", () => {
    expect(
      remoteVideoUrls([
        { kind: "video", url: "/uploads/v.mp4" },
        { kind: "photo", url: "https://abc.r2.cloudflarestorage.com/super-media/p.jpg" },
        { kind: "video", url: "https://abc.r2.cloudflarestorage.com/super-media/v.mp4" },
      ]),
    ).toEqual(["https://abc.r2.cloudflarestorage.com/super-media/v.mp4"]);
  });

  it("resolves when every remote video becomes readable", async () => {
    const check = vi.fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const wait = vi.fn(async () => undefined);
    await waitUntilRemoteVideosReady(
      ["https://abc.r2.cloudflarestorage.com/super-media/v.mp4"],
      check,
      { wait, maxAttempts: 3 },
    );
    expect(check).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledTimes(1);
  });

  it("throws if the blob never becomes readable", async () => {
    const check = vi.fn().mockResolvedValue(false);
    await expect(
      waitUntilRemoteVideosReady(["https://abc.r2.cloudflarestorage.com/super-media/v.mp4"], check, {
        wait: async () => undefined,
        maxAttempts: 2,
      }),
    ).rejects.toThrow(he.completionVideosNotReady);
  });
});
