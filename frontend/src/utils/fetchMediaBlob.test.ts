import { describe, expect, it, vi } from "vitest";
import { fetchMediaBlob, fetchMediaBlobWithRetry } from "./fetchMediaBlob";

vi.mock("./mediaUrl", () => ({
  mediaUrl: (path: string | null | undefined) => (path ? `/proxy?src=${path}` : null),
}));

describe("fetchMediaBlob", () => {
  it("fetches the proxied media with credentials", async () => {
    const blob = new Blob(["img"], { type: "image/jpeg" });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, blob: async () => blob });
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchMediaBlob("/uploads/p.jpg")).resolves.toBe(blob);
    expect(fetchMock).toHaveBeenCalledWith("/proxy?src=/uploads/p.jpg", {
      credentials: "include",
      redirect: "follow",
    });
    vi.unstubAllGlobals();
  });

  it("follows a same-origin 302 to a presigned object URL", async () => {
    const blob = new Blob(["vid"], { type: "video/webm" });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 302,
        headers: { get: (name: string) => (name === "Location" ? "https://signed.example/v.webm" : null) },
      })
      .mockResolvedValueOnce({ ok: true, status: 200, blob: async () => blob });
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchMediaBlob("https://abc.r2.cloudflarestorage.com/super-media/v.webm")).resolves.toBe(
      blob,
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/proxy?src=https://abc.r2.cloudflarestorage.com/super-media/v.webm",
      { credentials: "include", redirect: "manual" },
    );
    expect(fetchMock).toHaveBeenNthCalledWith(2, "https://signed.example/v.webm");
    vi.unstubAllGlobals();
  });

  it("rejects when the path cannot be resolved", async () => {
    await expect(fetchMediaBlob("")).rejects.toThrow("empty media path");
  });

  it("rejects when the proxy fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    await expect(fetchMediaBlob("/uploads/p.jpg")).rejects.toThrow("media fetch failed: 403");
    vi.unstubAllGlobals();
  });

  it("retries a 404 then returns the blob", async () => {
    const blob = new Blob(["img"], { type: "image/jpeg" });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: true, blob: async () => blob });
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchMediaBlobWithRetry("/uploads/p.jpg", async () => undefined)).resolves.toBe(blob);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });

  it("does not retry a 401", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchMediaBlobWithRetry("/uploads/p.jpg", async () => undefined)).rejects.toThrow(
      "media fetch failed: 401",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
