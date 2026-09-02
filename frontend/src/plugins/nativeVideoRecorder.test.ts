import { beforeEach, describe, expect, it, vi } from "vitest";

const { record, isNativePlatform, getPlatform, convertFileSrc, ensureNativeAvPermissions } = vi.hoisted(
  () => ({
    record: vi.fn(),
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
  registerPlugin: () => ({ record, isAvailable: vi.fn() }),
}));

vi.mock("./mediaPermissions", () => ({
  ensureNativeAvPermissions: (...args: unknown[]) => ensureNativeAvPermissions(...args),
}));

import { canUseNativeVideoRecorder, fileFromNativePath, recordNativeVideo } from "./nativeVideoRecorder";

describe("nativeVideoRecorder", () => {
  beforeEach(() => {
    record.mockReset();
    isNativePlatform.mockReset();
    getPlatform.mockReset();
    ensureNativeAvPermissions.mockReset();
    vi.unstubAllGlobals();
  });

  it("is only available on native Android", () => {
    isNativePlatform.mockReturnValue(true);
    getPlatform.mockReturnValue("android");
    expect(canUseNativeVideoRecorder()).toBe(true);
    getPlatform.mockReturnValue("ios");
    expect(canUseNativeVideoRecorder()).toBe(false);
    isNativePlatform.mockReturnValue(false);
    getPlatform.mockReturnValue("android");
    expect(canUseNativeVideoRecorder()).toBe(false);
  });

  it("returns null when the oved cancels the native recorder", async () => {
    isNativePlatform.mockReturnValue(true);
    getPlatform.mockReturnValue("android");
    ensureNativeAvPermissions.mockResolvedValue(true);
    record.mockResolvedValue({ cancelled: true });
    await expect(recordNativeVideo()).resolves.toBeNull();
  });

  it("builds a single mp4 file from the native path", async () => {
    isNativePlatform.mockReturnValue(true);
    getPlatform.mockReturnValue("android");
    ensureNativeAvPermissions.mockResolvedValue(true);
    record.mockResolvedValue({
      cancelled: false,
      path: "/data/cache/task-video.mp4",
      mimeType: "video/mp4",
      durationSeconds: 8,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        blob: async () => new Blob(["mp4-bytes"], { type: "video/mp4" }),
      })),
    );
    const result = await recordNativeVideo({ minSeconds: 5 });
    expect(ensureNativeAvPermissions).toHaveBeenCalledWith({
      camera: true,
      microphone: true,
      requireMicrophone: false,
    });
    expect(result?.durationSeconds).toBe(8);
    expect(result?.file.type).toBe("video/mp4");
    expect(result?.file.name.endsWith(".mp4")).toBe(true);
    expect(convertFileSrc).toHaveBeenCalled();
  });

  it("rejects a native clip shorter than minSeconds", async () => {
    isNativePlatform.mockReturnValue(true);
    getPlatform.mockReturnValue("android");
    ensureNativeAvPermissions.mockResolvedValue(true);
    record.mockResolvedValue({
      cancelled: false,
      path: "/data/cache/task-video.mp4",
      mimeType: "video/mp4",
      durationSeconds: 2,
    });
    await expect(recordNativeVideo({ minSeconds: 5 })).rejects.toThrow("too-short");
  });

  it("throws when camera permission is denied", async () => {
    isNativePlatform.mockReturnValue(true);
    getPlatform.mockReturnValue("android");
    ensureNativeAvPermissions.mockResolvedValue(false);
    await expect(recordNativeVideo()).rejects.toThrow("permission");
    expect(record).not.toHaveBeenCalled();
  });

  it("reads a cache path through the Capacitor file URL", async () => {
    const blob = new Blob(["x"], { type: "video/mp4" });
    vi.stubGlobal("fetch", vi.fn(async () => ({ blob: async () => blob })));
    const file = await fileFromNativePath("/cache/a.mp4");
    expect(file.size).toBe(1);
    expect(file.name.endsWith(".mp4")).toBe(true);
    expect(convertFileSrc).toHaveBeenCalledWith("file:///cache/a.mp4");
  });

  it("names a jpeg cache file as a photo", async () => {
    const blob = new Blob(["x"], { type: "image/jpeg" });
    vi.stubGlobal("fetch", vi.fn(async () => ({ blob: async () => blob })));
    const file = await fileFromNativePath("/cache/a.jpg", "image/jpeg");
    expect(file.name.endsWith(".jpg")).toBe(true);
    expect(file.type).toBe("image/jpeg");
  });
});
