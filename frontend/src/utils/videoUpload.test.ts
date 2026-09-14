import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockPost, mockNativePut, mockNativeAvailable, mockWriteCache } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockNativePut: vi.fn(),
  mockNativeAvailable: vi.fn(),
  mockWriteCache: vi.fn(),
}));

vi.mock("../services/api", () => ({
  default: { post: (...args: unknown[]) => mockPost(...args) },
}));

vi.mock("../plugins/nativeBlobUpload", () => ({
  canUseNativeBlobUpload: () => mockNativeAvailable(),
  putBlobFromNativePath: (...args: unknown[]) => mockNativePut(...args),
  writeFileToNativeCache: (...args: unknown[]) => mockWriteCache(...args),
}));

import { attachNativeMediaPath } from "./nativeMediaPath";
import {
  directPutHeaders,
  fileForBlobVideoUpload,
  putDirectVideo,
  shouldUseLocalVideoProxy,
  shouldUseSameOriginVideoProxy,
  uploadVideoFile,
} from "./videoUpload";

const directIntent = {
  mode: "direct" as const,
  pathname: "task_videos/a.mp4",
  putUrl: "https://abc.r2.cloudflarestorage.com/super-media/task_videos/a.mp4?X-Amz-Signature=sig",
  headers: { "Content-Type": "video/mp4" },
  url: "https://abc.r2.cloudflarestorage.com/super-media/task_videos/a.mp4",
  kind: "video" as const,
};

describe("videoUpload", () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockNativePut.mockReset();
    mockWriteCache.mockReset();
    mockNativeAvailable.mockReturnValue(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("sends only Content-Type on the presigned PUT", () => {
    const headers = directPutHeaders(
      directIntent,
      new File(["clip"], "clip.webm", { type: "video/webm" }),
    );
    expect(headers).toEqual({ "Content-Type": "video/webm" });
  });

  it("strips MediaRecorder codec suffixes so R2 accepts the webm", () => {
    const recorded = new File(["clip"], "clip.webm", { type: "video/webm;codecs=vp9,opus" });
    const upload = fileForBlobVideoUpload(recorded);
    expect(upload.type).toBe("video/webm");
    expect(upload.size).toBe(recorded.size);
  });

  it("retries a Failed to fetch PUT then succeeds", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({ ok: true });
    const file = new File(["clip"], "clip.webm", { type: "video/webm;codecs=vp8,opus" });
    const pending = putDirectVideo(directIntent, file, fetchMock);
    await vi.runAllTimersAsync();
    const result = await pending;
    expect(result.url).toBe(directIntent.url);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({ "Content-Type": "video/webm" }),
      }),
    );
    vi.useRealTimers();
  });

  it("uploads the video bytes to the presigned URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    const file = new File(["clip"], "clip.mp4", { type: "video/mp4" });
    const result = await putDirectVideo(directIntent, file, fetchMock);
    expect(result.url).toBe(directIntent.url);
    expect(fetchMock).toHaveBeenCalledWith(
      directIntent.putUrl,
      expect.objectContaining({ method: "PUT", body: file }),
    );
  });

  it("uses the direct intent when object storage is enabled", async () => {
    mockPost.mockResolvedValue({ data: directIntent });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    const proxy = vi.fn();
    const out = await uploadVideoFile(
      new File(["x"], "a.mp4", { type: "video/mp4" }),
      "task",
      proxy,
      fetchMock,
    );
    expect(out.url).toBe(directIntent.url);
    expect(proxy).not.toHaveBeenCalled();
  });

  it("does not fall back to the proxy after a failed direct PUT", async () => {
    mockPost.mockResolvedValue({ data: directIntent });
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    const proxy = vi.fn();
    await expect(
      uploadVideoFile(new File(["x"], "a.mp4", { type: "video/mp4" }), "task", proxy, fetchMock),
    ).rejects.toThrow("upload failed");
    expect(proxy).not.toHaveBeenCalled();
  });

  it("falls back to the same-origin proxy when Chrome CORS-blocks the PUT", async () => {
    vi.useFakeTimers();
    mockPost.mockResolvedValue({ data: directIntent });
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const proxy = vi.fn().mockResolvedValue({ url: "/uploads/v.mp4" });
    const pending = uploadVideoFile(
      new File(["x"], "a.mp4", { type: "video/mp4" }),
      "task",
      proxy,
      fetchMock,
    );
    await vi.runAllTimersAsync();
    await expect(pending).resolves.toEqual({ url: "/uploads/v.mp4" });
    expect(proxy).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("streams an Android cache file through OkHttp instead of fetch", async () => {
    mockNativeAvailable.mockReturnValue(true);
    mockNativePut.mockResolvedValue({ url: "" });
    const file = attachNativeMediaPath(
      new File(["clip"], "clip.mp4", { type: "video/mp4" }),
      "/data/cache/task-video.mp4",
    );
    const result = await putDirectVideo(directIntent, file);
    expect(result.url).toBe(directIntent.url);
    expect(mockNativePut).toHaveBeenCalledWith(
      "/data/cache/task-video.mp4",
      directIntent.putUrl,
      expect.objectContaining({ "Content-Type": "video/mp4" }),
    );
    expect(mockWriteCache).not.toHaveBeenCalled();
  });

  it("does not use WebView fetch for a webm recorded in the app", async () => {
    mockNativeAvailable.mockReturnValue(true);
    mockWriteCache.mockResolvedValue("/cache/upload-1.webm");
    mockNativePut.mockResolvedValue({ url: "" });
    const file = new File(["clip"], "clip.webm", { type: "video/webm" });
    const result = await putDirectVideo(directIntent, file);
    expect(result.url).toBe(directIntent.url);
    expect(mockWriteCache).toHaveBeenCalledWith(file);
    expect(mockNativePut).toHaveBeenCalledWith(
      "/cache/upload-1.webm",
      directIntent.putUrl,
      expect.any(Object),
    );
  });

  it("uses the local API proxy in Vite instead of a CORS PUT", async () => {
    expect(shouldUseLocalVideoProxy(true)).toBe(true);
    expect(shouldUseLocalVideoProxy(false)).toBe(false);
    expect(shouldUseSameOriginVideoProxy(false, false)).toBe(false);
    mockPost.mockResolvedValue({ data: directIntent });
    const proxy = vi.fn().mockResolvedValue({ url: "/uploads/local.webm" });
    const out = await uploadVideoFile(
      new File(["x"], "a.webm", { type: "video/webm" }),
      "task",
      proxy,
      undefined,
      true,
    );
    expect(out.url).toBe("/uploads/local.webm");
    expect(proxy).toHaveBeenCalled();
  });

  it("uses a direct PUT on Chrome prod instead of proxying through the API", async () => {
    mockPost.mockResolvedValue({ data: directIntent });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const proxy = vi.fn();
    const out = await uploadVideoFile(
      new File(["x"], "a.webm", { type: "video/webm" }),
      "task",
      proxy,
      undefined,
      false,
      false,
    );
    expect(out.url).toBe(directIntent.url);
    expect(proxy).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalled();
  });

  it("falls back to the proxy multipart when object storage is off", async () => {
    mockPost.mockResolvedValue({ data: { mode: "proxy" } });
    const proxy = vi.fn().mockResolvedValue({ url: "/uploads/v.mp4" });
    const out = await uploadVideoFile(new File(["x"], "a.mp4"), "task", proxy);
    expect(out.url).toBe("/uploads/v.mp4");
    expect(proxy).toHaveBeenCalled();
  });
});
