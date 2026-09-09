import { describe, expect, it } from "vitest";
import { bytesToBase64, videoFileExt } from "./bytesToBase64";

describe("bytesToBase64", () => {
  it("encodes bytes the same way as btoa", () => {
    expect(bytesToBase64(new Uint8Array([104, 105]))).toBe(btoa("hi"));
  });

  it("picks the video extension from the file", () => {
    expect(videoFileExt(new File(["x"], "a.webm", { type: "video/webm" }))).toBe(".webm");
    expect(videoFileExt(new File(["x"], "clip", { type: "video/mp4" }))).toBe(".mp4");
  });
});
