import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDueReached } from "./useDueReached";

describe("useDueReached", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-02T16:00:00+03:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is false before due_at and true afterwards", () => {
    const { result } = renderHook(() => useDueReached("2026-09-02T16:05:00+03:00"));
    expect(result.current).toBe(false);
    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000);
    });
    expect(result.current).toBe(true);
  });

  it("is true when due_at is already past", () => {
    const { result } = renderHook(() => useDueReached("2026-09-02T15:00:00+03:00"));
    expect(result.current).toBe(true);
  });
});
