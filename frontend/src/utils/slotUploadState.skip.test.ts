import { describe, expect, it } from "vitest";
import type { CompletionRequirement } from "./completionMedia";
import {
  allHandedOver,
  clearSkip,
  emptySlotStates,
  filmedCount,
  handedOverCount,
  isSkipPending,
  markFilmed,
  markSkipFailed,
  markSkipSent,
  markSkipped,
  needsSending,
  skippedCount,
  slotStatesFromCompletion,
} from "./slotUploadState";

const reqs: CompletionRequirement[] = [
  { kind: "video", title: "a" },
  { kind: "video", title: "b" },
];
const reason = { reasonCode: "area_blocked" as const, reasonText: null };

describe("markSkipped", () => {
  it("hands the card over with its reason, still to be sent", () => {
    const states = markSkipped(emptySlotStates(reqs), 0, reason);
    expect(states[0]).toMatchObject({ status: "skipped", skip: { reasonCode: "area_blocked", sent: false } });
    expect(isSkipPending(states[0])).toBe(true);
    expect(needsSending(states)).toBe(true);
    expect(handedOverCount(states)).toBe(1);
    expect(filmedCount(states)).toBe(0);
    expect(skippedCount(states)).toBe(1);
  });

  it("drops a take that was in review", () => {
    const filmed = markFilmed(emptySlotStates(reqs), 0, { capturedAt: "t", previewUrl: "blob:x" });
    const states = markSkipped(filmed, 0, reason);
    expect(states[0].previewUrl).toBeNull();
    expect(states[0].capturedAt).toBeNull();
  });

  it("never overwrites a card already sent or uploading", () => {
    const sent = [{ status: "sent" as const, kind: "video" as const }];
    expect(markSkipped(sent, 0, reason)).toBe(sent);
    const uploading = [{ status: "uploading" as const, kind: "video" as const }];
    expect(markSkipped(uploading, 0, reason)).toBe(uploading);
  });

  it("ignores an unknown index", () => {
    const states = emptySlotStates(reqs);
    expect(markSkipped(states, 5, reason)).toBe(states);
  });

  it("lets the summary open once every card is filmed or skipped", () => {
    const states = markSkipped(emptySlotStates(reqs).map((s, i) => (i === 1 ? { ...s, status: "ready" as const } : s)), 0, reason);
    expect(allHandedOver(states)).toBe(true);
  });
});

describe("clearSkip", () => {
  it("frees the card again (« לצלם עכשיו »)", () => {
    const states = clearSkip(markSkipped(emptySlotStates(reqs), 0, reason), 0);
    expect(states[0]).toMatchObject({ status: "idle", skip: null });
    expect(needsSending(states)).toBe(false);
  });

  it("leaves a card that was not skipped untouched", () => {
    const states = emptySlotStates(reqs);
    expect(clearSkip(states, 0)).toBe(states);
  });
});

describe("markSkipSent / markSkipFailed", () => {
  it("marks the reason as known by the server and keeps the audio url instead of the file", () => {
    const audio = new File(["x"], "a.webm");
    const skipped = markSkipped(emptySlotStates(reqs), 0, { ...reason, audio });
    const sent = markSkipSent(skipped, 0, "/u/a.webm");
    expect(sent[0].skip).toMatchObject({ sent: true, audio: null, audioUrl: "/u/a.webm" });
    expect(needsSending(sent)).toBe(false);
  });

  it("keeps the error so the card can be retried", () => {
    const failed = markSkipFailed(markSkipped(emptySlotStates(reqs), 0, reason), 0, "boom");
    expect(failed[0]).toMatchObject({ status: "skipped", error: "boom" });
    expect(isSkipPending(failed[0])).toBe(true);
  });

  it("ignores a card that is not skipped", () => {
    const states = emptySlotStates(reqs);
    expect(markSkipSent(states, 0)).toBe(states);
    expect(markSkipFailed(states, 0, "x")).toBe(states);
  });
});

describe("slotStatesFromCompletion with a skipped attachment", () => {
  it("restores the card as skipped and already sent", () => {
    const completion = {
      completion_attachments: [{ kind: "video", skipped: { reason_code: "other", reason_text: "סגור", audio_url: "/s.webm" } }],
    };
    const states = slotStatesFromCompletion(reqs, completion as never);
    expect(states[0]).toMatchObject({
      status: "skipped",
      skip: { reasonCode: "other", reasonText: "סגור", audioUrl: "/s.webm", sent: true },
    });
    expect(states[1].status).toBe("idle");
  });
});
