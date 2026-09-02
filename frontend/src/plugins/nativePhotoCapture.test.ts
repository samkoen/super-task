import { beforeEach, describe, expect, it, vi } from "vitest";

const { capture, isNativePlatform, getPlatform, convertFileSrc, ensureNativeAvPermissions } = vi.hoisted(
  () => ({
    capture: vi.fn(),
    isNativePlatform: vi.fn(),
    getPlatform: vi.fn(),
    convertFileSrc: vi.fn((src: string) => `converted:${src}`),
    ensureNativeAvPermissions: vi.fn(),
  }),
);

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => isNativePlatform(),
    getPlatform: () => getPlatform(),
    convertFileSrc: (src: string) => convertFileSrc(src),
  },
  registerPlugin: () => ({ capture, record: vi.fn(), isAvailable: vi.fn() }),
}));

vi.mock("./mediaPermissions", () => ({
  ensureNativeAvPermissions: (...args: unknown[]) => ensureNativeAvPermissions(...args),
}));

import { canUseNativePhotoCapture, captureNativePhoto } from "./nativePhotoCapture";

describe("nativePhotoCapture", () => {
  beforeEach(() => {
    capture.mockReset();
    isNativePlatform.mockReset();
    getPlatform.mockReset();
    ensureNativeAvPermissions.mockReset();
    vi.unstubAllGlobals();
  });

  it("is only available on native Android", () => {
    isNativePlatform.mockReturnValue(true);
    getPlatform.mockReturnValue("android");
    expect(canUseNativePhotoCapture()).toBe(true);
    getPlatform.mockReturnValue("ios");
    expect(canUseNativePhotoCapture()).toBe(false);
  });

  it("returns null when the oved cancels the native camera", async () => {
    isNativePlatform.mockReturnValue(true);
    getPlatform.mockReturnValue("android");
    ensureNativeAvPermissions.mockResolvedValue(true);
    capture.mockResolvedValue({ cancelled: true });
    await expect(captureNativePhoto()).resolves.toBeNull();
  });

  it("builds a jpeg file from the native path", async () => {
    isNativePlatform.mockReturnValue(true);
    getPlatform.mockReturnValue("android");
    ensureNativeAvPermissions.mockResolvedValue(true);
    capture.mockResolvedValue({
      cancelled: false,
      path: "/data/cache/task-photo.jpg",
      mimeType: "image/jpeg",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        blob: async () => new Blob(["jpg"], { type: "image/jpeg" }),
      })),
    );
    const file = await captureNativePhoto();
    expect(ensureNativeAvPermissions).toHaveBeenCalledWith({
      camera: true,
      microphone: false,
    });
    expect(file?.type).toBe("image/jpeg");
    expect(file?.name.endsWith(".jpg")).toBe(true);
  });

  it("throws when camera permission is denied", async () => {
    isNativePlatform.mockReturnValue(true);
    getPlatform.mockReturnValue("android");
    ensureNativeAvPermissions.mockResolvedValue(false);
    await expect(captureNativePhoto()).rejects.toThrow("permission");
    expect(capture).not.toHaveBeenCalled();
  });
});
