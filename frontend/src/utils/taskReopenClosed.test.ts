import { describe, expect, it } from "vitest";
import { canReopenClosedTask } from "./taskReopenClosed";
import type { TaskCompletion } from "../services/taskService";

function completion(over: Partial<TaskCompletion> = {}): TaskCompletion {
  return {
    id: "c1",
    occurrence_id: "occ-1",
    status: "completed",
    note: null,
    photo_path: "/p.jpg",
    video_path: null,
    audio_path: null,
    not_completed_reason: null,
    completed_by_id: "u1",
    completed_at: "2026-09-10T12:00:00+03:00",
    manager_review_status: "approved",
    ...over,
  };
}

describe("canReopenClosedTask", () => {
  it("allows a completed approved task", () => {
    expect(
      canReopenClosedTask({ status: "completed", completion: completion() }),
    ).toBe(true);
  });

  it("blocks an already open task", () => {
    expect(
      canReopenClosedTask({
        status: "in_progress",
        completion: completion({ manager_review_status: "rejected" }),
      }),
    ).toBe(false);
    expect(
      canReopenClosedTask({
        status: "pending_review",
        completion: completion({ manager_review_status: "pending" }),
      }),
    ).toBe(false);
  });

  it("blocks empty or unapproved completion", () => {
    expect(canReopenClosedTask(null)).toBe(false);
    expect(canReopenClosedTask({ status: "completed", completion: null })).toBe(false);
    expect(
      canReopenClosedTask({
        status: "completed",
        completion: completion({ manager_review_status: null }),
      }),
    ).toBe(false);
  });
});
