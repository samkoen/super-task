import { describe, expect, it } from "vitest";
import {
  attachmentsFromCompletion,
  filledVisualCount,
  fillsFromAttachments,
  slotDisplayTitle,
  slotFillSrc,
  slotGuideText,
} from "./completionSlotView";
import type { CompletionRequirement } from "./completionMedia";

describe("completionSlotView", () => {
  it("prefers the menahel title over the generic label", () => {
    const req: CompletionRequirement = { kind: "photo", title: "מדף חלב" };
    expect(slotDisplayTitle(req, 0)).toBe("מדף חלב");
  });

  it("uses the hint for read/listen, then the title", () => {
    expect(slotGuideText({ kind: "photo", title: "מדף", hint: "כל השורה" })).toBe("כל השורה");
    expect(slotGuideText({ kind: "photo", title: "מדף" })).toBe("מדף");
    expect(slotGuideText({ kind: "photo" })).toBe("");
  });

  it("maps attachments to the same slot index", () => {
    const reqs: CompletionRequirement[] = [
      { kind: "video", min_seconds: 10, title: "קופה" },
      { kind: "photo", title: "מקרר" },
    ];
    const fills = fillsFromAttachments(reqs, [
      { kind: "video", url: "/v.mp4" },
      { kind: "photo", url: "/p.jpg" },
    ]);
    expect(fills[0]?.url).toBe("/v.mp4");
    expect(fills[1]?.url).toBe("/p.jpg");
    expect(filledVisualCount(reqs, fills)).toBe(2);
  });

  it("uses the oved capture as fill instead of the menahel example", () => {
    expect(slotFillSrc({ previewUrl: "blob:oved-video", kind: "video" })).toBe("blob:oved-video");
    expect(slotFillSrc(null)).toBeNull();
  });

  it("reads legacy completion paths when attachments are missing", () => {
    expect(
      attachmentsFromCompletion({
        photo_path: "/p.jpg",
        video_path: null,
        audio_path: null,
      }),
    ).toEqual([{ kind: "photo", url: "/p.jpg" }]);
  });

  it("ignores audio when counting filled visual slots", () => {
    const reqs: CompletionRequirement[] = [
      { kind: "photo", title: "מדף" },
      { kind: "audio" },
    ];
    expect(
      filledVisualCount(reqs, [null, { url: "/a.webm", kind: "audio" }]),
    ).toBe(0);
  });
});
