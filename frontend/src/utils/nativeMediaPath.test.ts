import { describe, expect, it } from "vitest";
import { attachNativeMediaPath, nativeMediaPath } from "./nativeMediaPath";

describe("nativeMediaPath", () => {
  it("keeps the Android cache path on the same File instance", () => {
    const file = new File(["mp4"], "a.mp4", { type: "video/mp4" });
    attachNativeMediaPath(file, "/data/cache/task-video.mp4");
    expect(nativeMediaPath(file)).toBe("/data/cache/task-video.mp4");
  });

  it("returns undefined when the file was not recorded natively", () => {
    expect(nativeMediaPath(new File(["x"], "a.webm"))).toBeUndefined();
    expect(nativeMediaPath(null)).toBeUndefined();
  });
});
