import { describe, expect, it } from "vitest";
import { summarizePendingUploads } from "./usePendingUploads";
import type { QueuedSlot } from "../utils/slotUploadQueue";

const entry = (occurrenceId: string, status: QueuedSlot["status"]) => ({ occurrenceId, status }) as QueuedSlot;

describe("summarizePendingUploads", () => {
  it("counts tasks with files waiting to be sent, not drafts, held takes or refused files", () => {
    const summary = summarizePendingUploads([
      entry("t1", "pending"),
      entry("t1", "pending"),
      entry("t2", "pending"),
      entry("t3", "draft"),
      entry("t4", "held"),
      entry("t5", "failed"),
      entry("t6", "acked"),
    ]);
    expect(summary.taskCount).toBe(2);
    expect([...summary.taskIds].sort()).toEqual(["t1", "t2"]);
  });
});
