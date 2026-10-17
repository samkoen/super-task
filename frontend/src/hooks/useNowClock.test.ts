import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useNowClock } from "./useNowClock";

describe("useNowClock", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("ticks forward with the interval", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 15, 7, 28, 0));
    const { result } = renderHook(() => useNowClock(1000));
    expect(result.current.getMinutes()).toBe(28);
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current.getMinutes()).toBe(29);
  });

  it("stops ticking after unmount", () => {
    vi.useFakeTimers();
    const clear = vi.spyOn(window, "clearInterval");
    const { unmount } = renderHook(() => useNowClock(1000));
    unmount();
    expect(clear).toHaveBeenCalled();
  });
});
