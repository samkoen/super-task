import { describe, expect, it, vi } from "vitest";
import type { CompletionAttachment, CompletionRequirement } from "./completionMedia";
import {
  approveAll,
  approvedDraft,
  buildReviewItems,
  buildReviewPayload,
  hasRemarkContent,
  initialDrafts,
  isRejectedAttachment,
  rejectedDraft,
  setDraft,
  summarizeReview,
} from "./slotReview";

const reqs: CompletionRequirement[] = [
  { kind: "photo", title: "מדף" },
  { kind: "video", min_seconds: 10, title: "קופה" },
];

const attachments: CompletionAttachment[] = [
  { kind: "photo", url: "/uploads/a.jpg" },
  { kind: "video", url: "/uploads/b.mp4", duration_seconds: 12 },
  { kind: "photo", url: "/uploads/extra.jpg" },
];

describe("buildReviewItems", () => {
  it("marks one required item per requirement and extras as optional", () => {
    const items = buildReviewItems(reqs, attachments);
    expect(items.map((i) => [i.index, i.required, i.title])).toEqual([
      [0, true, "מדף"],
      [1, true, "קופה"],
      [2, false, expect.any(String)],
    ]);
  });

  it("requires every filled file when the task has no requirements", () => {
    const items = buildReviewItems([], attachments);
    expect(items.every((i) => i.required)).toBe(true);
  });

  it("skips empty slots and blank messages", () => {
    const items = buildReviewItems(
      [{ kind: "photo" }, { kind: "message" }],
      [{ kind: "photo", url: "" }, { kind: "message", text: "  " }],
    );
    expect(items).toEqual([]);
  });
});

describe("summarizeReview", () => {
  const items = buildReviewItems(reqs, attachments);

  it("is pending until every required item has a V or an X", () => {
    const summary = summarizeReview(items, { 0: approvedDraft() });
    expect(summary).toMatchObject({ outcome: "pending", remaining: 1, canFinish: false });
  });

  it("does not wait for optional extras", () => {
    const drafts = { 0: approvedDraft(), 1: approvedDraft() };
    expect(summarizeReview(items, drafts)).toMatchObject({ outcome: "approve", canFinish: true });
  });

  it("reopens as soon as one item is an X", () => {
    const drafts = setDraft(approveAll(items), 1, rejectedDraft({ remark: "flou" }));
    expect(summarizeReview(items, drafts)).toMatchObject({ outcome: "reopen", rejected: 1, approved: 2 });
  });

  it("cannot finish with nothing to review", () => {
    expect(summarizeReview([], {})).toMatchObject({ canFinish: false, outcome: "pending" });
  });
});

describe("drafts", () => {
  it("keeps a V from a previous round on unchanged files only", () => {
    const withReview: CompletionAttachment[] = [
      { kind: "photo", url: "/uploads/a.jpg", review: { status: "approved" } },
      { kind: "video", url: "/uploads/b.mp4", review: { status: "rejected", remark: "x" } },
    ];
    const drafts = initialDrafts(buildReviewItems(reqs, withReview));
    expect(Object.keys(drafts)).toEqual(["0"]);
    expect(drafts[0].status).toBe("approved");
  });

  it("trims the remark and detects remark content", () => {
    const draft = rejectedDraft({ remark: "  ליטוש  " });
    expect(draft.remark).toBe("ליטוש");
    expect(hasRemarkContent(draft)).toBe(true);
    expect(hasRemarkContent(rejectedDraft({ remark: "" }))).toBe(false);
    expect(hasRemarkContent(undefined)).toBe(false);
  });

  it("recognises a rejected attachment", () => {
    expect(isRejectedAttachment({ kind: "photo", review: { status: "rejected" } })).toBe(true);
    expect(isRejectedAttachment({ kind: "photo", review: { status: "approved" } })).toBe(false);
    expect(isRejectedAttachment(null)).toBe(false);
  });
});

describe("buildReviewPayload", () => {
  const items = buildReviewItems(reqs, attachments);

  it("sends the rating only when everything is approved", async () => {
    const uploadPhoto = vi.fn();
    const payload = await buildReviewPayload({
      items,
      drafts: { 0: approvedDraft(), 1: approvedDraft() },
      rating: 5,
      uploadPhoto,
    });
    expect(payload).toEqual({
      decisions: [
        { index: 0, status: "approved" },
        { index: 1, status: "approved" },
      ],
      quality_rating: 5,
    });
    expect(uploadPhoto).not.toHaveBeenCalled();
  });

  it("uploads the annotated image of a rejected item and keeps its remark", async () => {
    const uploadPhoto = vi.fn().mockResolvedValue({ url: "/uploads/marked.jpg" });
    const file = new File(["x"], "marked.jpg", { type: "image/jpeg" });
    const payload = await buildReviewPayload({
      items,
      drafts: {
        0: approvedDraft(),
        1: rejectedDraft({ remark: "צלם מקרוב", annotatedFile: file }),
      },
      rating: 5,
      uploadPhoto,
    });
    expect(uploadPhoto).toHaveBeenCalledWith(file);
    expect(payload).toEqual({
      decisions: [
        { index: 0, status: "approved" },
        { index: 1, status: "rejected", remark: "צלם מקרוב", annotated_url: "/uploads/marked.jpg" },
      ],
    });
  });

  it("sends a bare X when there is no remark and no image", async () => {
    const payload = await buildReviewPayload({
      items,
      drafts: { 0: rejectedDraft({ remark: "" }), 1: approvedDraft() },
      rating: null,
      uploadPhoto: vi.fn(),
    });
    expect(payload.decisions[0]).toEqual({ index: 0, status: "rejected" });
  });
});
