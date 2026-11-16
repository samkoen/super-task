import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { taskService, type TaskOccurrence } from "../services/taskService";
import { he } from "../i18n/he";
import { useTaskReviewDecision } from "./useTaskReviewDecision";

vi.mock("../services/taskService", () => ({
  taskService: { approve: vi.fn(), confirmMedia: vi.fn(), reviewSlots: vi.fn(), uploadPhoto: vi.fn() },
}));

function task(mediaReady: boolean): TaskOccurrence {
  return {
    id: "t1",
    status: "pending_review",
    completion_requirements: [],
    completion: { status: "completed", completed_at: "2026-11-16T06:47:00", media_ready: mediaReady, completion_attachments: [] },
  } as unknown as TaskOccurrence;
}

describe("useTaskReviewDecision", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(taskService.confirmMedia).mockReset();
    vi.mocked(taskService.approve).mockReset().mockResolvedValue({} as never);
  });
  afterEach(() => vi.useRealTimers());

  it("polls until the videos are ready", async () => {
    vi.mocked(taskService.confirmMedia).mockResolvedValueOnce({ media_ready: false } as never).mockResolvedValue({ media_ready: true } as never);
    const { result } = renderHook(() => useTaskReviewDecision(task(false), vi.fn()));
    expect(result.current.mediaReady).toBe(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(2100); });
    expect(result.current.mediaReady).toBe(true);
    expect(taskService.confirmMedia).toHaveBeenCalledWith("t1");
  });

  it("does not poll when the videos are already ready", () => {
    renderHook(() => useTaskReviewDecision(task(true), vi.fn()));
    expect(taskService.confirmMedia).not.toHaveBeenCalled();
  });

  it("refuses to approve without stars", async () => {
    const onDecided = vi.fn();
    const { result } = renderHook(() => useTaskReviewDecision(task(true), onDecided));
    act(() => result.current.setRating(null));
    act(() => result.current.approve());
    expect(result.current.error).toBe(he.qualityRatingRequired);
    expect(taskService.approve).not.toHaveBeenCalled();
  });

  it("approves with the chosen stars and reports the result", async () => {
    const onDecided = vi.fn();
    const { result } = renderHook(() => useTaskReviewDecision(task(true), onDecided));
    act(() => result.current.setRating(5));
    await act(async () => { result.current.approve(); await vi.runAllTimersAsync(); });
    expect(taskService.approve).toHaveBeenCalledWith("t1", { quality_rating: 5 });
    expect(onDecided).toHaveBeenCalledWith(he.taskApprovedSuccess);
  });
});
