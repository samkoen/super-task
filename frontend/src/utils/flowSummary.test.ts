import { describe, expect, it } from "vitest";
import { he } from "../i18n/he";
import { hasPendingUpload, readyForSummary, summaryRows } from "./flowSummary";
import type { SlotUiState } from "./slotUploadState";

const reqs = [
  { kind: "video" as const, title: "גיבוי" },
  { kind: "video" as const, title: "בסטה" },
];
const sent: SlotUiState = { status: "sent", kind: "video", sentAt: "2026-11-09T06:43:00" };
const queued: SlotUiState = { status: "queued", kind: "video" };

describe("summaryRows", () => {
  it("builds one row per configured card with the menahel's titles", () => {
    const rows = summaryRows(reqs, [sent, queued]);
    expect(rows.map((r) => r.title)).toEqual(["גיבוי", "בסטה"]);
  });

  it("shows the send time on a sent row and the waiting status on a queued one", () => {
    const rows = summaryRows(reqs, [sent, queued]);
    expect(rows[0].statusText).toBe(he.flowTabSent("06:43"));
    expect(rows[0].sent).toBe(true);
    expect(rows[1].statusText).toBe(he.flowTabWaiting);
    expect(rows[1].sent).toBe(false);
  });

  it("works for a single card", () => {
    expect(summaryRows([reqs[0]], [sent])).toHaveLength(1);
  });

  it("tolerates a missing state", () => {
    expect(summaryRows(reqs, [sent])[1].status).toBe("idle");
  });
});

describe("summary readiness", () => {
  it("is ready once every card is sent or kept for upload", () => {
    expect(readyForSummary([sent, queued])).toBe(true);
  });

  it("is not ready while a card is still open or has failed", () => {
    expect(readyForSummary([sent, { status: "idle", kind: "video" }])).toBe(false);
    expect(readyForSummary([sent, { status: "failed", kind: "video" }])).toBe(false);
  });

  it("is not ready for an empty list", () => {
    expect(readyForSummary([])).toBe(false);
  });

  it("detects uploads still waiting for the network", () => {
    expect(hasPendingUpload([sent, queued])).toBe(true);
    expect(hasPendingUpload([sent, sent])).toBe(false);
  });
});
