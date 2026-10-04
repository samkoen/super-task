import { describe, expect, it } from "vitest";
import { referenceFileKind } from "./referenceMediaFile";

describe("referenceFileKind", () => {
  it("accepts an image or a video from a file", () => {
    expect(referenceFileKind(new File(["a"], "a.jpg", { type: "image/jpeg" }))).toBe("photo");
    expect(referenceFileKind(new File(["a"], "a.mp4", { type: "video/mp4" }))).toBe("video");
  });

  it("falls back to the file name when the type is empty", () => {
    expect(referenceFileKind(new File(["a"], "shelf.HEIC", { type: "" }))).toBe("photo");
    expect(referenceFileKind(new File(["a"], "clip.mov", { type: "" }))).toBe("video");
  });

  it("rejects a file that is neither photo nor video", () => {
    expect(referenceFileKind(new File(["a"], "note.pdf", { type: "application/pdf" }))).toBeNull();
  });
});
