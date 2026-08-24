import { describe, expect, it, vi } from "vitest";

const { canUseNativeVideoRecorder, recordNativeVideo } = vi.hoisted(() => ({
  canUseNativeVideoRecorder: vi.fn(),
  recordNativeVideo: vi.fn(),
}));

vi.mock("../plugins/nativeVideoRecorder", () => ({
  canUseNativeVideoRecorder: () => canUseNativeVideoRecorder(),
  recordNativeVideo: (...args: unknown[]) => recordNativeVideo(...args),
}));

import { launchVideoCapture } from "./launchVideoCapture";

describe("launchVideoCapture", () => {
  it("opens the web recorder when native CameraX is unavailable", async () => {
    canUseNativeVideoRecorder.mockReturnValue(false);
    const openWeb = vi.fn();
    await launchVideoCapture({
      openWeb,
      onNative: vi.fn(),
      onPermissionDenied: vi.fn(),
    });
    expect(openWeb).toHaveBeenCalledTimes(1);
    expect(recordNativeVideo).not.toHaveBeenCalled();
  });

  it("sends the single native file after a camera switch recording", async () => {
    canUseNativeVideoRecorder.mockReturnValue(true);
    const file = new File(["mp4"], "a.mp4", { type: "video/mp4" });
    recordNativeVideo.mockResolvedValue({ file, durationSeconds: 12 });
    const onNative = vi.fn();
    const openWeb = vi.fn();
    await launchVideoCapture({
      minSeconds: 10,
      openWeb,
      onNative,
      onPermissionDenied: vi.fn(),
    });
    expect(recordNativeVideo).toHaveBeenCalledWith({ minSeconds: 10 });
    expect(onNative).toHaveBeenCalledWith(file, 12);
    expect(openWeb).not.toHaveBeenCalled();
  });

  it("reports a denied camera instead of opening the web dialog", async () => {
    canUseNativeVideoRecorder.mockReturnValue(true);
    recordNativeVideo.mockRejectedValue(new Error("permission"));
    const onPermissionDenied = vi.fn();
    const openWeb = vi.fn();
    await launchVideoCapture({
      openWeb,
      onNative: vi.fn(),
      onPermissionDenied,
    });
    expect(onPermissionDenied).toHaveBeenCalledTimes(1);
    expect(openWeb).not.toHaveBeenCalled();
  });

  it("does not open the web recorder when the native clip is too short", async () => {
    canUseNativeVideoRecorder.mockReturnValue(true);
    recordNativeVideo.mockRejectedValue(new Error("too-short"));
    const openWeb = vi.fn();
    const onNative = vi.fn();
    await launchVideoCapture({
      minSeconds: 10,
      openWeb,
      onNative,
      onPermissionDenied: vi.fn(),
    });
    expect(onNative).not.toHaveBeenCalled();
    expect(openWeb).not.toHaveBeenCalled();
  });

  it("falls back to the web recorder if CameraX fails", async () => {
    canUseNativeVideoRecorder.mockReturnValue(true);
    recordNativeVideo.mockRejectedValue(new Error("device"));
    const openWeb = vi.fn();
    await launchVideoCapture({
      openWeb,
      onNative: vi.fn(),
      onPermissionDenied: vi.fn(),
    });
    expect(openWeb).toHaveBeenCalledTimes(1);
  });
});
