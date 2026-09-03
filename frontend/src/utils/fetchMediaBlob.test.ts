import { describe, expect, it, vi } from "vitest";
import { fetchMediaBlob } from "./fetchMediaBlob";

vi.mock("./mediaUrl", () => ({
  mediaUrl: (path: string | null | undefined) => (path ? `/proxy?src=${path}` : null),
}));

describe("fetchMediaBlob", () => {
  it("fetches the proxied media with credentials", async () => {
    const blob = new Blob(["img"], { type: "image/jpeg" });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, blob: async () => blob });
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchMediaBlob("/uploads/p.jpg")).resolves.toBe(blob);
    expect(fetchMock).toHaveBeenCalledWith("/proxy?src=/uploads/p.jpg", { credentials: "include" });
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
});
