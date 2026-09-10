import { beforeEach, describe, expect, it, vi } from "vitest";
import { he } from "../i18n/he";
import {
  slotsMeetTaskRequirements,
  uploadRequirementSlots,
} from "./employeeCompletionUpload";
import { applyPendingSlot, createPendingMedia, revokePendingMedia } from "./pendingMedia";
import type { CompletionRequirement } from "./completionMedia";

const threeVideos: CompletionRequirement[] = [
  { kind: "video", min_seconds: 10 },
  { kind: "video", min_seconds: 10 },
  { kind: "video", min_seconds: 10 },
];

function videoSlot(name: string, bytes = "clip") {
  return createPendingMedia(new File([bytes], name, { type: "video/webm" }), 12);
}

describe("employeeCompletionUpload", () => {
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

  it("uploads three videos in slot order", async () => {
    const slots = [
      applyPendingSlot([null, null, null], 0, new File(["a"], "a.webm", { type: "video/webm" }), 12),
    ][0];
    const withSecond = applyPendingSlot(slots, 1, new File(["b"], "b.webm", { type: "video/webm" }), 11);
    const filled = applyPendingSlot(withSecond, 2, new File(["c"], "c.webm", { type: "video/webm" }), 10);
    const uploaders = {
      photo: vi.fn(),
      video: vi.fn(async (file: File) => ({ url: `/uploads/${file.name}` })),
      audio: vi.fn(),
    };
    const attachments = await uploadRequirementSlots(threeVideos, filled, uploaders, true);
    expect(attachments.map((item) => item.url)).toEqual([
      "/uploads/a.webm",
      "/uploads/b.webm",
      "/uploads/c.webm",
    ]);
    expect(uploaders.video).toHaveBeenCalledTimes(3);
    filled.forEach((item) => revokePendingMedia(item));
  });

  it("rejects an empty middle slot when all files are required", async () => {
    const slots = [videoSlot("a.webm"), null, videoSlot("c.webm")];
    const uploaders = {
      photo: vi.fn(),
      video: vi.fn(async (file: File) => ({ url: `/uploads/${file.name}` })),
      audio: vi.fn(),
    };
    await expect(uploadRequirementSlots(threeVideos, slots, uploaders, true)).rejects.toThrow(
      he.completionFillSlotsHint,
    );
    slots.forEach((item) => revokePendingMedia(item));
  });

  it("does not treat a zero-byte video as ready", () => {
    const empty = createPendingMedia(new File([], "empty.webm", { type: "video/webm" }), 12);
    expect(slotsMeetTaskRequirements([{ kind: "video", min_seconds: 10 }], [empty])).toBe(false);
    revokePendingMedia(empty);
  });
});
