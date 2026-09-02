import { describe, expect, it, vi } from "vitest";

const { canUseNativePhotoCapture, captureNativePhoto } = vi.hoisted(() => ({
  canUseNativePhotoCapture: vi.fn(),
  captureNativePhoto: vi.fn(),
}));

vi.mock("../plugins/nativePhotoCapture", () => ({
  canUseNativePhotoCapture: () => canUseNativePhotoCapture(),
  captureNativePhoto: (...args: unknown[]) => captureNativePhoto(...args),
}));

import { launchPhotoCapture } from "./launchPhotoCapture";

describe("launchPhotoCapture", () => {
  it("opens the web camera when native CameraX is unavailable", async () => {
    canUseNativePhotoCapture.mockReturnValue(false);
    const openWeb = vi.fn();
    await launchPhotoCapture({
      openWeb,
      onNative: vi.fn(),
      onPermissionDenied: vi.fn(),
    });
    expect(openWeb).toHaveBeenCalledTimes(1);
    expect(captureNativePhoto).not.toHaveBeenCalled();
  });

  it("sends the native jpeg after a CameraX shot", async () => {
    canUseNativePhotoCapture.mockReturnValue(true);
    const file = new File(["jpg"], "a.jpg", { type: "image/jpeg" });
    captureNativePhoto.mockResolvedValue(file);
    const onNative = vi.fn();
    const openWeb = vi.fn();
    await launchPhotoCapture({
      openWeb,
      onNative,
      onPermissionDenied: vi.fn(),
    });
    expect(onNative).toHaveBeenCalledWith(file);
    expect(openWeb).not.toHaveBeenCalled();
  });

  it("reports a denied camera instead of opening the web dialog", async () => {
    canUseNativePhotoCapture.mockReturnValue(true);
    captureNativePhoto.mockRejectedValue(new Error("permission"));
    const onPermissionDenied = vi.fn();
    const openWeb = vi.fn();
    await launchPhotoCapture({
      openWeb,
      onNative: vi.fn(),
      onPermissionDenied,
    });
    expect(onPermissionDenied).toHaveBeenCalledTimes(1);
    expect(openWeb).not.toHaveBeenCalled();
  });

  it("falls back to the web camera if CameraX fails", async () => {
    canUseNativePhotoCapture.mockReturnValue(true);
    captureNativePhoto.mockRejectedValue(new Error("device"));
    const openWeb = vi.fn();
    await launchPhotoCapture({
      openWeb,
      onNative: vi.fn(),
      onPermissionDenied: vi.fn(),
    });
    expect(openWeb).toHaveBeenCalledTimes(1);
  });
});
