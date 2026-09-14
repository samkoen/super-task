import { beforeEach, describe, expect, it, vi } from "vitest";

const { putFromFile, createTemp, appendChunk, isNativePlatform, getPlatform } = vi.hoisted(
  () => ({
    putFromFile: vi.fn(),
    createTemp: vi.fn(),
    appendChunk: vi.fn(),
    isNativePlatform: vi.fn(),
    getPlatform: vi.fn(),
  }),
);

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => isNativePlatform(),
    getPlatform: () => getPlatform(),
  },
  registerPlugin: () => ({ putFromFile, createTemp, appendChunk }),
}));

import { canUseNativeBlobUpload, putBlobFromNativePath, writeFileToNativeCache } from "./nativeBlobUpload";

describe("nativeBlobUpload", () => {
  beforeEach(() => {
    putFromFile.mockReset();
    createTemp.mockReset();
    appendChunk.mockReset();
    isNativePlatform.mockReset();
    getPlatform.mockReset();
  });

  it("is only available on native Android", () => {
    isNativePlatform.mockReturnValue(true);
    getPlatform.mockReturnValue("android");
    expect(canUseNativeBlobUpload()).toBe(true);
    getPlatform.mockReturnValue("web");
    expect(canUseNativeBlobUpload()).toBe(false);
  });

  it("streams the cache file through the native plugin", async () => {
    putFromFile.mockResolvedValue({ url: "" });
    const putUrl = "https://abc.r2.cloudflarestorage.com/super-media/a.mp4?X-Amz-Signature=sig";
    const result = await putBlobFromNativePath("/cache/a.mp4", putUrl, {
      "Content-Type": "video/mp4",
    });
    expect(result.url).toBe("");
    expect(putFromFile).toHaveBeenCalledWith({
      path: "/cache/a.mp4",
      url: putUrl,
      headers: { "Content-Type": "video/mp4" },
    });
  });

  it("writes a webm blob to the Android cache in chunks", async () => {
    createTemp.mockResolvedValue({ path: "/cache/upload-1.webm" });
    appendChunk.mockResolvedValue(undefined);
    const path = await writeFileToNativeCache(new File(["webm-bytes"], "clip.webm", { type: "video/webm" }));
    expect(path).toBe("/cache/upload-1.webm");
    expect(createTemp).toHaveBeenCalledWith({ ext: ".webm" });
    expect(appendChunk).toHaveBeenCalled();
  });

  it("accepts an empty native PUT body when the object URL is already known", async () => {
    putFromFile.mockResolvedValue({});
    await expect(putBlobFromNativePath("/cache/a.mp4", "https://signed.example/put", {})).resolves.toEqual({
      url: "",
    });
  });
});
