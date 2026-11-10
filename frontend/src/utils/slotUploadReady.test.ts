import { describe, expect, it } from "vitest";
import { he } from "../i18n/he";
import { tabStatusText } from "./flowStack";
import { summaryPhase } from "./flowSummary";
import { isHandedOver, markReady, needsSending, type SlotUiState } from "./slotUploadState";

const idle: SlotUiState = { status: "idle", kind: "video" };
const filmed: SlotUiState = { status: "filmed", kind: "video", capturedAt: "2026-11-10T06:40:00.000Z" };
const ready: SlotUiState = { status: "ready", kind: "video" };
const sent: SlotUiState = { status: "sent", kind: "video" };
const failed: SlotUiState = { status: "failed", kind: "video" };
const NOW = "2026-11-10T07:00:00.000Z";

describe("markReady", () => {
  it("keeps the capture time of a filmed card and marks it ready", () => {
    const states = markReady([filmed, idle], 0, NOW);
    expect(states[0]).toMatchObject({ status: "ready", capturedAt: filmed.capturedAt });
    expect(states[1]).toBe(idle);
  });

  it("stores the text of a message card", () => {
    const states = markReady([{ status: "idle", kind: "message" }], 0, NOW, "tout est propre");
    expect(states[0]).toMatchObject({ status: "ready", text: "tout est propre", capturedAt: NOW });
  });

  it("never downgrades a card already sent, and ignores an unknown index", () => {
    const states = [sent];
    expect(markReady(states, 0, NOW)).toBe(states);
    expect(markReady(states, 4, NOW)).toBe(states);
  });

  it("refuses to keep a file card that was never filmed (or was discarded)", () => {
    const states = [idle];
    expect(markReady(states, 0, NOW)).toBe(states);
  });
});

describe("ready status", () => {
  it("counts as handed over so the stack moves to the next card", () => {
    expect(isHandedOver("ready")).toBe(true);
    expect(isHandedOver("filmed")).toBe(false);
  });

  it("reads « מוכן לשליחה » on the folded tab", () => {
    expect(tabStatusText(ready)).toBe(he.flowTabReady);
  });
});

describe("needsSending", () => {
  it("is true while a card is ready or failed", () => {
    expect(needsSending([sent, ready])).toBe(true);
    expect(needsSending([sent, failed])).toBe(true);
  });

  it("is false when everything is sent, queued or uploading, or when the list is empty", () => {
    expect(needsSending([sent, { status: "queued", kind: "video" }, { status: "uploading", kind: "video" }])).toBe(false);
    expect(needsSending([])).toBe(false);
  });
});

describe("summaryPhase", () => {
  it("is ready until the oved taps אישור ושליחה", () => {
    expect(summaryPhase([ready, ready], false)).toBe("ready");
  });

  it("is sending while the hook sends or a card uploads", () => {
    expect(summaryPhase([ready], true)).toBe("sending");
    expect(summaryPhase([{ status: "uploading", kind: "video" }, ready], false)).toBe("sending");
  });

  it("is done once nothing is left to send, even if a file waits for the network", () => {
    expect(summaryPhase([sent, sent], false)).toBe("done");
    expect(summaryPhase([sent, { status: "queued", kind: "video" }], false)).toBe("done");
  });

  it("goes back to ready when a card was refused", () => {
    expect(summaryPhase([sent, failed], false)).toBe("ready");
  });
});
