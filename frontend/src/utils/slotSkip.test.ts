import { describe, expect, it } from "vitest";
import { he } from "../i18n/he";
import type { CompletionAttachment, CompletionRequirement } from "./completionMedia";
import { emptySkipDraft, isSkipDraftValid, skipAttachment, skipReasonLabel, skipReasonText, skippedSlots, SKIP_TEXT_MAX } from "./slotSkip";

const audio = new File(["x"], "a.webm", { type: "audio/webm" });

describe("isSkipDraftValid", () => {
  it("needs a reason", () => {
    expect(isSkipDraftValid(emptySkipDraft)).toBe(false);
  });

  it("accepts a predefined reason alone", () => {
    expect(isSkipDraftValid({ ...emptySkipDraft, reasonCode: "no_stock" })).toBe(true);
  });

  it("« אחר » needs a text or a voice explanation", () => {
    const other = { ...emptySkipDraft, reasonCode: "other" as const };
    expect(isSkipDraftValid(other)).toBe(false);
    expect(isSkipDraftValid({ ...other, reasonText: "   " })).toBe(false);
    expect(isSkipDraftValid({ ...other, reasonText: "הדלת נעולה" })).toBe(true);
    expect(isSkipDraftValid({ ...other, audio })).toBe(true);
  });

  it("rejects a text longer than the server accepts", () => {
    const long = "א".repeat(SKIP_TEXT_MAX + 1);
    expect(isSkipDraftValid({ ...emptySkipDraft, reasonCode: "no_stock", reasonText: long })).toBe(false);
  });
});

describe("skipReasonLabel / skipReasonText", () => {
  it("labels every predefined reason", () => {
    expect(skipReasonLabel("area_blocked")).toBe(he.flowSkipReasonAreaBlocked);
    expect(skipReasonLabel("no_stock")).toBe(he.flowSkipReasonNoStock);
    expect(skipReasonLabel("camera_issue")).toBe(he.flowSkipReasonCameraIssue);
    expect(skipReasonLabel("other")).toBe(he.flowSkipReasonOther);
  });

  it("prefers the free text only for « אחר »", () => {
    expect(skipReasonText({ reasonCode: "other", reasonText: "סגור" })).toBe("סגור");
    expect(skipReasonText({ reasonCode: "no_stock", reasonText: "סגור" })).toBe(he.flowSkipReasonNoStock);
    expect(skipReasonText({ reasonCode: "other", reasonText: " " })).toBe(he.flowSkipReasonOther);
  });
});

describe("skipAttachment", () => {
  it("builds the payload the server expects, without empty fields", () => {
    expect(skipAttachment("video", { reasonCode: "no_stock" })).toEqual({ kind: "video", skipped: { reason_code: "no_stock" } });
  });

  it("carries the trimmed text and the uploaded audio url", () => {
    expect(skipAttachment("photo", { reasonCode: "other", reasonText: " סגור " }, "/u/a.webm")).toEqual({
      kind: "photo",
      skipped: { reason_code: "other", reason_text: "סגור", audio_url: "/u/a.webm" },
    });
  });
});

describe("skippedSlots", () => {
  const reqs: CompletionRequirement[] = [
    { kind: "video", title: "גיבוי" },
    { kind: "video", title: "בסטה" },
  ];

  it("lists only the skipped attachments, titled by the menahel's requirement", () => {
    const attachments: CompletionAttachment[] = [
      { kind: "video", url: "/a.mp4" },
      { kind: "video", skipped: { reason_code: "area_blocked", audio_url: "/s.webm" } },
    ];
    const slots = skippedSlots(reqs, attachments);
    expect(slots).toHaveLength(1);
    expect(slots[0]).toMatchObject({ index: 1, title: "בסטה" });
    expect(slots[0].skip.audio_url).toBe("/s.webm");
  });

  it("is empty without attachments", () => {
    expect(skippedSlots(reqs, null)).toEqual([]);
    expect(skippedSlots(reqs, [])).toEqual([]);
  });

  it("still lists a skipped slot whose requirement vanished", () => {
    const slots = skippedSlots([], [{ kind: "video", skipped: { reason_code: "other", reason_text: "x" } }]);
    expect(slots).toHaveLength(1);
  });
});
