import { describe, expect, it } from "vitest";
import {
  isPrivateObjectMediaUrl,
  isRemoteObjectMediaUrl,
  mediaUrl,
} from "./mediaUrl";

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

  it("proxies private R2 URLs", () => {
    const objectUrl = "https://abc.r2.cloudflarestorage.com/super-media/task_photos/a.jpg";
    expect(mediaUrl(objectUrl)).toBe(`/api/media/proxy?src=${encodeURIComponent(objectUrl)}`);
    expect(isPrivateObjectMediaUrl(objectUrl)).toBe(true);
    expect(isRemoteObjectMediaUrl(objectUrl)).toBe(true);
    expect(isRemoteObjectMediaUrl("/uploads/v.mp4")).toBe(false);
  });

  it("proxies leftover private Vercel Blob URLs", () => {
    const blob = "https://store.private.blob.vercel-storage.com/task_photos/a.jpg";
    expect(mediaUrl(blob)).toBe(`/api/media/proxy?src=${encodeURIComponent(blob)}`);
  });

  it("proxies local /uploads paths via authenticated API", () => {
    expect(mediaUrl("/uploads/task_photos/a.jpg")).toBe(
      `/api/media/proxy?src=${encodeURIComponent("/uploads/task_photos/a.jpg")}`,
    );
  });
});
