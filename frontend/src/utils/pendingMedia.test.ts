import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  completionAttachmentFromPending,
  applyPendingSlot,
  createPendingMedia,
  replacePendingMedia,
  revokePendingMedia,
  uploadPendingMedia,
} from "./pendingMedia";

describe("pendingMedia", () => {
  beforeEach(() => {
    let seq = 0;
    vi.stubGlobal(
      "URL",
      class {
        static createObjectURL = vi.fn(() => `blob:mock-${++seq}`);
        static revokeObjectURL = vi.fn();
      },
    );
  });

  it("createPendingMedia builds a blob preview URL", () => {
    const file = new File([new Uint8Array([1, 2, 3])], "a.jpg", { type: "image/jpeg" });
    const pending = createPendingMedia(file);
    expect(pending.file).toBe(file);
    expect(pending.previewUrl.startsWith("blob:")).toBe(true);
    expect(pending.capturedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    revokePendingMedia(pending);
  });

  it("forwards capturedAt on the completion attachment", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-18T08:12:00+03:00"));
    const pending = createPendingMedia(new File(["x"], "x.jpg", { type: "image/jpeg" }));
    expect(completionAttachmentFromPending("photo", "/p.jpg", pending)).toEqual({
      kind: "photo",
      url: "/p.jpg",
      duration_seconds: undefined,
      captured_at: new Date("2026-08-18T08:12:00+03:00").toISOString(),
    });
    revokePendingMedia(pending);
    vi.useRealTimers();
  });

  it("replacePendingMedia revokes the previous URL", () => {
    const first = createPendingMedia(new File(["a"], "a.jpg", { type: "image/jpeg" }));
    const second = replacePendingMedia(first, new File(["b"], "b.jpg", { type: "image/jpeg" }));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(first.previewUrl);
    expect(second.previewUrl).not.toBe(first.previewUrl);
    revokePendingMedia(second);
  });

  it("uploadPendingMedia uploads the file and returns the url", async () => {
    const file = new File(["x"], "x.jpg", { type: "image/jpeg" });
    const pending = createPendingMedia(file);
    const url = await uploadPendingMedia(pending, async (f) => {
      expect(f).toBe(file);
      return { url: "https://blob.example/x.jpg" };
    });
    expect(url).toBe("https://blob.example/x.jpg");
    revokePendingMedia(pending);
  });

  it("uploadPendingMedia returns undefined when empty", async () => {
    const url = await uploadPendingMedia(null, async () => ({ url: "nope" }));
    expect(url).toBeUndefined();
  });

  it("uploadPendingMedia skips a zero-byte file", async () => {
    const pending = createPendingMedia(new File([], "empty.webm", { type: "video/webm" }));
    const url = await uploadPendingMedia(pending, async () => ({ url: "nope" }));
    expect(url).toBeUndefined();
    revokePendingMedia(pending);
  });

  it("applyPendingSlot keeps earlier videos when filling the third slot", () => {
    const first = applyPendingSlot([null, null, null], 0, new File(["a"], "a.webm", { type: "video/webm" }), 12);
    const second = applyPendingSlot(first, 1, new File(["b"], "b.webm", { type: "video/webm" }), 11);
    const third = applyPendingSlot(second, 2, new File(["c"], "c.webm", { type: "video/webm" }), 10);
    expect(third.map((item) => item?.file.name)).toEqual(["a.webm", "b.webm", "c.webm"]);
    third.forEach((item) => revokePendingMedia(item));
  });
});
