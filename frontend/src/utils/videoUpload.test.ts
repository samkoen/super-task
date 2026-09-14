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
import { blobPutUrl, fileForBlobVideoUpload, putBlobWithClientToken, shouldUseLocalVideoProxy, shouldUseSameOriginVideoProxy, uploadVideoFile } from "./videoUpload";

const directIntent = {
  mode: "direct" as const,
  pathname: "task_videos/a.mp4",
  token: "vercel_blob_client_STORE_x",
  access: "private" as const,
  apiUrl: "https://vercel.com/api/blob",
  apiVersion: "11",
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

  it("builds the Blob PUT url with the pathname query", () => {
    expect(blobPutUrl("https://vercel.com/api/blob", "task_videos/a.mp4")).toBe(
      "https://vercel.com/api/blob?pathname=task_videos%2Fa.mp4",
    );
  });

  it("strips MediaRecorder codec suffixes so Blob accepts the webm", () => {
    const recorded = new File(["clip"], "clip.webm", { type: "video/webm;codecs=vp9,opus" });
    const upload = fileForBlobVideoUpload(recorded);
    expect(upload.type).toBe("video/webm");
    expect(upload.size).toBe(recorded.size);
  });

  it("retries a Failed to fetch Blob PUT then succeeds", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: "https://blob.example/v.webm" }),
      });
    const file = new File(["clip"], "clip.webm", { type: "video/webm;codecs=vp8,opus" });
    const pending = putBlobWithClientToken(directIntent, file, fetchMock);
    await vi.runAllTimersAsync();
    const result = await pending;
    expect(result.url).toBe("https://blob.example/v.webm");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({ "x-content-type": "video/webm" }),
      }),
    );
    vi.useRealTimers();
  });

  it("uploads the video bytes straight to Blob with the client token", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: "https://store.private.blob.vercel-storage.com/a.mp4" }),
    });
    const file = new File(["clip"], "clip.mp4", { type: "video/mp4" });
    const result = await putBlobWithClientToken(directIntent, file, fetchMock);
    expect(result.url).toContain("blob.vercel-storage.com");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://vercel.com/api/blob?pathname=task_videos%2Fa.mp4",
      expect.objectContaining({
        method: "PUT",
        body: file,
      }),
    );
  });

  it("uses the direct intent when Blob is enabled", async () => {
    mockPost.mockResolvedValue({ data: directIntent });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: "https://blob.example/v.mp4" }),
    });
    const proxy = vi.fn();
    const out = await uploadVideoFile(
      new File(["x"], "a.mp4", { type: "video/mp4" }),
      "task",
      proxy,
      fetchMock,
    );
    expect(out.url).toBe("https://blob.example/v.mp4");
    expect(proxy).not.toHaveBeenCalled();
  });

  it("does not fall back to the 413 proxy after a failed direct Blob PUT", async () => {
    mockPost.mockResolvedValue({ data: directIntent });
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    const proxy = vi.fn();
    await expect(
      uploadVideoFile(new File(["x"], "a.mp4", { type: "video/mp4" }), "task", proxy, fetchMock),
    ).rejects.toThrow("upload failed");
    expect(proxy).not.toHaveBeenCalled();
  });

  it("falls back to the same-origin proxy when Chrome CORS-blocks the Blob PUT", async () => {
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
    mockNativePut.mockResolvedValue({ url: "https://blob.example/native.mp4" });
    const file = attachNativeMediaPath(
      new File(["clip"], "clip.mp4", { type: "video/mp4" }),
      "/data/cache/task-video.mp4",
    );
    const result = await putBlobWithClientToken(directIntent, file);
    expect(result.url).toBe("https://blob.example/native.mp4");
    expect(mockNativePut).toHaveBeenCalledWith(
      "/data/cache/task-video.mp4",
      "https://vercel.com/api/blob?pathname=task_videos%2Fa.mp4",
      expect.objectContaining({ authorization: "Bearer vercel_blob_client_STORE_x" }),
    );
    expect(mockWriteCache).not.toHaveBeenCalled();
  });

  it("does not use WebView fetch for a webm recorded in the app", async () => {
    mockNativeAvailable.mockReturnValue(true);
    mockWriteCache.mockResolvedValue("/cache/upload-1.webm");
    mockNativePut.mockResolvedValue({ url: "https://blob.example/app.webm" });
    const file = new File(["clip"], "clip.webm", { type: "video/webm" });
    const result = await putBlobWithClientToken(directIntent, file);
    expect(result.url).toBe("https://blob.example/app.webm");
    expect(mockWriteCache).toHaveBeenCalledWith(file);
    expect(mockNativePut).toHaveBeenCalledWith(
      "/cache/upload-1.webm",
      "https://vercel.com/api/blob?pathname=task_videos%2Fa.mp4",
      expect.any(Object),
    );
  });

  it("uses the local API proxy in Vite instead of a CORS PUT to Blob", async () => {
    expect(shouldUseLocalVideoProxy(true)).toBe(true);
    expect(shouldUseLocalVideoProxy(false)).toBe(false);
    expect(shouldUseSameOriginVideoProxy(false, false)).toBe(false);
    expect(shouldUseSameOriginVideoProxy(false, true)).toBe(false);
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

  it("uses a direct Blob PUT on Chrome prod instead of proxying through the API", async () => {
    mockPost.mockResolvedValue({ data: directIntent });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: "https://blob.example/v.webm" }),
    });
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
    expect(out.url).toBe("https://blob.example/v.webm");
    expect(proxy).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalled();
    expect(mockPost).toHaveBeenCalled();
  });

  it("falls back to the proxy multipart when Blob is off", async () => {
    mockPost.mockResolvedValue({ data: { mode: "proxy" } });
    const proxy = vi.fn().mockResolvedValue({ url: "/uploads/v.mp4" });
    const out = await uploadVideoFile(new File(["x"], "a.mp4"), "task", proxy);
    expect(out.url).toBe("/uploads/v.mp4");
    expect(proxy).toHaveBeenCalled();
  });
});
