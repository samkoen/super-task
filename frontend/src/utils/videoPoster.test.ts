import { afterEach, describe, expect, it, vi } from "vitest";
import { capturePausedVideoFrame, captureVideoPoster } from "./videoPoster";

describe("captureVideoPoster", () => {
  it("returns null for an empty source", async () => {
    expect(await captureVideoPoster("")).toBeNull();
  });

  it("pauses and skips a frame that has no size", async () => {
    const video = document.createElement("video");
    const pause = vi.spyOn(video, "pause").mockImplementation(() => undefined);
    expect(await capturePausedVideoFrame(video)).toBeNull();
    expect(pause).toHaveBeenCalled();
  });

  it("returns a jpeg of the paused frame", async () => {
    const video = document.createElement("video");
    Object.defineProperty(video, "videoWidth", { value: 12 });
    Object.defineProperty(video, "videoHeight", { value: 8 });
    vi.spyOn(video, "pause").mockImplementation(() => undefined);
    const blob = new Blob(["jpeg"], { type: "image/jpeg" });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
    } as never);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
      callback?.(blob);
    });
    await expect(capturePausedVideoFrame(video)).resolves.toBe(blob);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
