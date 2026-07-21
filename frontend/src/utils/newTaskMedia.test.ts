import { describe, expect, it, vi } from "vitest";
import { mediaFromPhotoFile } from "./newTaskMedia";

describe("mediaFromPhotoFile", () => {
  it("stores pending photo and blob preview url", () => {
    const createObjectURL = vi.fn(() => "blob:photo-1");
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL: vi.fn() });
    const file = new File(["x"], "a.jpg", { type: "image/jpeg" });
    const media = mediaFromPhotoFile(file);
    expect(media.pending_photo).toBe(file);
    expect(media.reference_photo_url).toBe("blob:photo-1");
    expect(media.reference_video_url).toBe("");
    vi.unstubAllGlobals();
  });
});
