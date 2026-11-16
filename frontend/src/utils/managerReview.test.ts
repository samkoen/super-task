import { describe, expect, it } from "vitest";
import type { TaskOccurrence } from "../services/taskService";
import { managerReviewChecks, queuePosition, reviewQueueFromInbox, reviewSubtitle } from "./managerReview";
import type { InboxItem } from "./managerHome";

const queue = [
  { id: "a", title: "מחסן" },
  { id: "b", title: "חזית" },
  { id: "c", title: "קופות" },
];

function task(patch: Partial<TaskOccurrence> = {}): TaskOccurrence {
  return {
    id: "t1",
    title: "מחסן",
    status: "pending_review",
    assignee_name: "דני",
    department_name: null,
    branch_name: "שפע",
    min_video_seconds: 10,
    completion: { completed_at: "2026-11-16T06:47:00", completion_attachments: [] },
    ...patch,
  } as unknown as TaskOccurrence;
}

describe("reviewQueueFromInbox", () => {
  it("keeps only proofs to review, in order", () => {
    const items = [
      { key: "q", kind: "question", title: "שאלה", who: "", preview: "", taskId: "x" },
      { key: "r1", kind: "review", title: "מחסן", who: "", preview: "", taskId: "a" },
      { key: "c", kind: "chat", title: "רון", who: "", preview: "" },
      { key: "r2", kind: "review", title: "חזית", who: "", preview: "", taskId: "b" },
    ] as InboxItem[];
    expect(reviewQueueFromInbox(items)).toEqual([queue[0], queue[1]]);
  });
});

describe("queuePosition", () => {
  it("counts from one and points to the next card", () => {
    expect(queuePosition(queue, "b")).toEqual({ index: 2, total: 3, next: queue[2] });
  });

  it("skips decided cards and wraps around", () => {
    expect(queuePosition(queue, "c", ["a"])).toEqual({ index: 3, total: 3, next: queue[1] });
  });

  it("has no next card once everything is decided", () => {
    expect(queuePosition(queue, "a", ["b", "c"]).next).toBeNull();
  });

  it("treats a task outside the queue as a single card", () => {
    expect(queuePosition(queue, "zz")).toEqual({ index: 1, total: 1, next: null });
  });
});

describe("reviewSubtitle", () => {
  it("joins the oved, the department and the send time", () => {
    expect(reviewSubtitle(task({ department_name: "ירקות" }))).toBe("דני · ירקות · נשלח 06:47");
  });

  it("drops unknown parts", () => {
    expect(reviewSubtitle(task({ assignee_name: null, completion: null }))).toBe("");
  });
});

describe("managerReviewChecks", () => {
  it("shows nothing without a photo or a video", () => {
    expect(managerReviewChecks(task())).toEqual([]);
  });

  it("checks the video length and the shot time", () => {
    const checks = managerReviewChecks(task({
      completion: {
        completed_at: "2026-11-16T06:47:00",
        completion_attachments: [{ kind: "video", url: "/v.webm", duration_seconds: 6, captured_at: "2026-11-16T06:42:00" }],
      } as TaskOccurrence["completion"],
    }));
    expect(checks.map((c) => [c.id, c.ok])).toEqual([["length", false], ["shot", true]]);
  });

  it("does not check a length on a photo", () => {
    const checks = managerReviewChecks(task({
      completion: {
        completed_at: "2026-11-16T06:47:00",
        completion_attachments: [{ kind: "photo", url: "/p.jpg", captured_at: "2026-11-16T06:42:00" }],
      } as TaskOccurrence["completion"],
    }));
    expect(checks.map((c) => c.id)).toEqual(["shot"]);
  });
});
