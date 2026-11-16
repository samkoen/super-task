import { describe, expect, it } from "vitest";
import { he } from "../i18n/he";
import {
  hasPendingUpload,
  partialHeadline,
  readyForSummary,
  sentVideoCount,
  summaryCardHeading,
  summaryPhase,
  summaryRows,
  notYetCount,
} from "./flowSummary";
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

  it("a card marked « לא ניתן לצלם » counts as handed over", () => {
    expect(readyForSummary([sent, skipped])).toBe(true);
  });
});

const skipped: SlotUiState = { status: "skipped", kind: "video", skip: { reasonCode: "no_stock", sent: false } };

describe("summaryRows with a skipped card", () => {
  it("carries the reason and allows filming now while nothing has been sent", () => {
    const row = summaryRows(reqs, [sent, skipped])[1];
    expect(row.skipped).toBe(true);
    expect(row.reasonText).toBe(he.flowSkipReasonNoStock);
    expect(row.canFilmNow).toBe(true);
  });

  it("uses the free text of « אחר » as the reason", () => {
    const other: SlotUiState = { status: "skipped", kind: "video", skip: { reasonCode: "other", reasonText: "סגור", sent: false } };
    expect(summaryRows(reqs, [sent, other])[1].reasonText).toBe("סגור");
  });

  it("cannot be filmed now once the server knows the reason", () => {
    const delivered: SlotUiState = { ...skipped, skip: { reasonCode: "no_stock", sent: true } };
    expect(summaryRows(reqs, [sent, delivered])[1].canFilmNow).toBe(false);
  });

  it("a filmed card has no reason and no « לצלם עכשיו »", () => {
    const row = summaryRows(reqs, [sent, queued])[0];
    expect(row.skipped).toBe(false);
    expect(row.reasonText).toBe("");
    expect(row.canFilmNow).toBe(false);
    expect(row.sentTime).toBe("06:43");
  });
});

describe("partial summary wording", () => {
  it("is absent when everything was filmed", () => {
    expect(partialHeadline([sent, queued])).toBeNull();
  });

  it("counts the filmed videos out of the total and the skipped ones", () => {
    expect(partialHeadline([sent, skipped])).toEqual({
      title: he.flowSummaryTitlePartial(1, 2),
      subtitle: he.flowSummarySubtitlePartial(1),
    });
  });

  it("heads the card with the filmed count", () => {
    expect(summaryCardHeading([sent, skipped])).toBe(he.flowSummaryCardPartial(1, 2));
    expect(summaryCardHeading([sent, sent])).toBe(he.flowSummaryCardAll(2, 2));
  });

  it("counts only really sent videos for the confirmation popup", () => {
    expect(sentVideoCount([sent, skipped, queued])).toBe(1);
    expect(sentVideoCount([])).toBe(0);
  });

  it("goes done only when the skipped reason was sent too", () => {
    expect(summaryPhase([sent, skipped], false)).toBe("ready");
    expect(summaryPhase([sent, { ...skipped, skip: { reasonCode: "no_stock", sent: true } }], false)).toBe("done");
  });
});

describe("summary opened before the end (icon « סיכום »)", () => {
  const idle: SlotUiState = { status: "idle", kind: "video" };
  const ready: SlotUiState = { status: "ready", kind: "video" };

  it("marks a card not filmed yet and lets the oved film it now", () => {
    const row = summaryRows(reqs, [ready, idle])[1];
    expect(row.notYet).toBe(true);
    expect(row.canFilmNow).toBe(true);
    expect(summaryRows(reqs, [ready, idle])[0].notYet).toBe(false);
    expect(notYetCount([ready, idle])).toBe(1);
  });

  it("can send what is filmed even if other cards remain", () => {
    expect(summaryPhase([ready, idle], false)).toBe("ready");
  });

  it("is never done while a card remains: nothing to send means back to filming", () => {
    expect(summaryPhase([sent, idle], false)).toBe("incomplete");
    expect(summaryPhase([idle, idle], false)).toBe("incomplete");
    expect(summaryPhase([sent, sent], false)).toBe("done");
  });

  it("titles the partial state with the cards left", () => {
    expect(partialHeadline([sent, idle])).toEqual({
      title: he.flowSummaryTitlePartial(1, 2),
      subtitle: he.flowSummarySubtitleNotYet(1),
    });
    expect(summaryCardHeading([sent, idle])).toBe(he.flowSummaryCardPartial(1, 2));
  });
});
