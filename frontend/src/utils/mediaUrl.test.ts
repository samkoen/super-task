import { describe, expect, it } from "vitest";
import { isPrivateVercelBlobUrl, mediaUrl } from "./mediaUrl";

describe("mediaUrl", () => {
  it("returns null for empty path", () => {
    expect(mediaUrl(null)).toBeNull();
    expect(mediaUrl("")).toBeNull();
  });

  it("returns absolute public URLs unchanged", () => {
    expect(mediaUrl("https://cdn.example.com/x.jpg")).toBe("https://cdn.example.com/x.jpg");
  });

  it("returns local blob previews unchanged", () => {
    expect(mediaUrl("blob:http://localhost:5173/abc")).toBe("blob:http://localhost:5173/abc");
  });

  it("proxies private Vercel Blob URLs", () => {
    const blob =
      "https://store.private.blob.vercel-storage.com/task_photos/a.jpg";
    expect(mediaUrl(blob)).toBe(`/api/media/proxy?src=${encodeURIComponent(blob)}`);
    expect(isPrivateVercelBlobUrl(blob)).toBe(true);
  });

  it("proxies local /uploads paths via authenticated API", () => {
    expect(mediaUrl("/uploads/task_photos/a.jpg")).toBe(
      `/api/media/proxy?src=${encodeURIComponent("/uploads/task_photos/a.jpg")}`,
    );
  });
});
