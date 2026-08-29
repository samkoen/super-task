import { describe, expect, it, vi } from "vitest";
import { HOLD_MS, createHoldGesture } from "./holdGesture";

describe("createHoldGesture", () => {
  it("fires onTap when released before the hold delay", () => {
    vi.useFakeTimers();
    const onTap = vi.fn();
    const onHoldStart = vi.fn();
    const onHoldEnd = vi.fn();
    const gesture = createHoldGesture({ onTap, onHoldStart, onHoldEnd });
    gesture.onPointerDown({ pointerId: 1, currentTarget: {} });
    vi.advanceTimersByTime(HOLD_MS - 50);
    gesture.onPointerUp();
    expect(onTap).toHaveBeenCalledTimes(1);
    expect(onHoldStart).not.toHaveBeenCalled();
    expect(onHoldEnd).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("starts and ends a hold after the delay", () => {
    vi.useFakeTimers();
    const onTap = vi.fn();
    const onHoldStart = vi.fn();
    const onHoldEnd = vi.fn();
    const gesture = createHoldGesture({ onTap, onHoldStart, onHoldEnd });
    gesture.onPointerDown({ pointerId: 1, currentTarget: {} });
    vi.advanceTimersByTime(HOLD_MS);
    expect(onHoldStart).toHaveBeenCalledTimes(1);
    gesture.onPointerUp();
    expect(onHoldEnd).toHaveBeenCalledTimes(1);
    expect(onTap).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
