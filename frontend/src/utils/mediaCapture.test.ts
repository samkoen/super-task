import { describe, expect, it, vi } from "vitest";
import {
  blobToFile,
  capturePhotoFromVideo,
  classifyMediaError,
  getUserMediaWithFallback,
  normalizePhotoOrientation,
  pickVideoRecorderMimeType,
} from "./mediaCapture";

vi.mock("../plugins/mediaPermissions", () => ({
  ensureNativeAvPermissions: vi.fn().mockResolvedValue(true),
}));

describe("mediaCapture", () => {
  it("blobToFile wraps blob with filename and type", () => {
    const blob = new Blob(["x"], { type: "image/jpeg" });
    const file = blobToFile(blob, "photo.jpg");
    expect(file.name).toBe("photo.jpg");
    expect(file.type).toBe("image/jpeg");
    expect(file.size).toBe(1);
  });

  it("classifyMediaError maps DOMException names", () => {
    expect(classifyMediaError(new DOMException("denied", "NotAllowedError"))).toBe("permission");
    expect(classifyMediaError(new DOMException("missing", "NotFoundError"))).toBe("device");
    expect(classifyMediaError(new Error("other"))).toBe("unknown");
  });

  it("getUserMediaWithFallback tries softer constraints after device errors", async () => {
    const stream = { getTracks: () => [] } as unknown as MediaStream;
    const getUserMedia = vi
      .fn()
      .mockRejectedValueOnce(new DOMException("missing", "OverconstrainedError"))
      .mockResolvedValueOnce(stream);
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });

    await expect(
      getUserMediaWithFallback([
        { video: { facingMode: { ideal: "environment" } }, audio: false },
        { video: true, audio: false },
      ])
    ).resolves.toBe(stream);
    expect(getUserMedia).toHaveBeenCalledTimes(2);

    vi.unstubAllGlobals();
  });

  it("getUserMediaWithFallback stops on permission errors", async () => {
    const denied = new DOMException("denied", "NotAllowedError");
    const getUserMedia = vi.fn().mockRejectedValue(denied);
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });

    await expect(getUserMediaWithFallback([{ video: true }])).rejects.toBe(denied);
    expect(getUserMedia).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });

  it("capturePhotoFromVideo returns null when video has no dimensions", async () => {
    const video = document.createElement("video");
    await expect(capturePhotoFromVideo(video)).resolves.toBeNull();
  });

  it("capturePhotoFromVideo draws current frame to jpeg blob", async () => {
    const video = document.createElement("video");
    Object.defineProperty(video, "videoWidth", { value: 10 });
    Object.defineProperty(video, "videoHeight", { value: 10 });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((cb) => {
      cb(new Blob(["img"], { type: "image/jpeg" }));
    });

    const blob = await capturePhotoFromVideo(video);
    expect(blob?.type).toBe("image/jpeg");
  });

  it("normalizePhotoOrientation returns original blob when createImageBitmap is unavailable", async () => {
    const blob = new Blob(["img"], { type: "image/jpeg" });
    const original = globalThis.createImageBitmap;
    // @ts-expect-error test override
    globalThis.createImageBitmap = undefined;
    await expect(normalizePhotoOrientation(blob)).resolves.toBe(blob);
    globalThis.createImageBitmap = original;
  });

  it("normalizePhotoOrientation redraws oriented bitmap into jpeg blob", async () => {
    const blob = new Blob(["img"], { type: "image/jpeg" });
    const close = vi.fn();
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockResolvedValue({
        width: 1200,
        height: 900,
        close,
      })
    );
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((cb) => {
      cb(new Blob(["normalized"], { type: "image/jpeg" }));
    });

    const normalized = await normalizePhotoOrientation(blob);
    expect(normalized.type).toBe("image/jpeg");
    expect(close).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("pickVideoRecorderMimeType returns first supported mime", () => {
    const original = globalThis.MediaRecorder;
    globalThis.MediaRecorder = {
      isTypeSupported: (type: string) => type.startsWith("video/webm"),
    } as unknown as typeof MediaRecorder;

    expect(pickVideoRecorderMimeType()).toBe("video/webm;codecs=vp9,opus");

    globalThis.MediaRecorder = original;
  });
});
