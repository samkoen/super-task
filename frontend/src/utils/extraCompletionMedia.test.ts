import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_EXTRA_COMPLETION_MEDIA,
  appendExtraMedia,
  extrasFromAttachments,
  removeExtraMedia,
} from "./extraCompletionMedia";

describe("extraCompletionMedia", () => {
  beforeEach(() => {
    let seq = 0;
    vi.stubGlobal(
      "URL",
      class {
        static createObjectURL = vi.fn(() => `blob:extra-${++seq}`);
        static revokeObjectURL = vi.fn();
      },
    );
  });

  it("appends a photo after the required slots and stops at the limit", () => {
    const file = new File(["img"], "shelf.jpg", { type: "image/jpeg" });
    const first = appendExtraMedia([], "photo", file);
    expect(first).toHaveLength(1);
    expect(first[0]?.kind).toBe("photo");
    expect(first[0]?.media.previewUrl).toBe("blob:extra-1");

    let extras = first;
    for (let i = 1; i < MAX_EXTRA_COMPLETION_MEDIA + 2; i += 1) {
      extras = appendExtraMedia(extras, "audio", new File(["a"], `n${i}.webm`, { type: "audio/webm" }));
    }
    expect(extras).toHaveLength(MAX_EXTRA_COMPLETION_MEDIA);
  });

  it("keeps files that do not fill a required slot", () => {
    const extras = extrasFromAttachments([{ kind: "photo", title: "מדף" }], [
      { kind: "photo", url: "/required.jpg" },
      { kind: "video", url: "/extra.mp4", duration_seconds: 4 },
      { kind: "audio", url: "/note.webm" },
    ]);
    expect(extras.map((item) => item.kind)).toEqual(["video", "audio"]);
    expect(extras[0]?.media.keptUrl).toBe("/extra.mp4");
  });

  it("drops a removed extra and revokes its preview", () => {
    const extras = appendExtraMedia([], "video", new File(["v"], "clip.webm", { type: "video/webm" }), 3);
    const next = removeExtraMedia(extras, 0);
    expect(next).toEqual([]);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:extra-1");
  });
});
