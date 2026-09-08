import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPost } = vi.hoisted(() => ({ mockPost: vi.fn() }));

vi.mock("../services/api", () => ({
  default: { post: (...args: unknown[]) => mockPost(...args) },
}));

import {
  blobPutUrl,
  putBlobWithClientToken,
  unpatchedFetch,
  uploadVideoFile,
} from "./videoUpload";

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
  });

  it("builds the Blob PUT url with the pathname query", () => {
    expect(blobPutUrl("https://vercel.com/api/blob", "task_videos/a.mp4")).toBe(
      "https://vercel.com/api/blob?pathname=task_videos%2Fa.mp4",
    );
  });

  it("uses a WebView fetch that is not window.fetch (CapacitorHttp)", () => {
    const patched = vi.fn();
    vi.stubGlobal("fetch", patched);
    const raw = unpatchedFetch();
    expect(raw).not.toBe(patched);
    vi.unstubAllGlobals();
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

  it("falls back to the proxy multipart when Blob is off", async () => {
    mockPost.mockResolvedValue({ data: { mode: "proxy" } });
    const proxy = vi.fn().mockResolvedValue({ url: "/uploads/v.mp4" });
    const out = await uploadVideoFile(new File(["x"], "a.mp4"), "task", proxy);
    expect(out.url).toBe("/uploads/v.mp4");
    expect(proxy).toHaveBeenCalled();
  });
});
