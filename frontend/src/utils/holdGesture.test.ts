import { describe, expect, it, vi } from "vitest";
import { HOLD_MS, createHoldGesture } from "./holdGesture";

describe("createHoldGesture", () => {
  it("fires onTap when released before the hold delay", () => {
    vi.useFakeTimers();
    const onTap = vi.fn();
    const onHoldStart = vi.fn();
    const onHoldEnd = vi.fn();
    const gesture = createHoldGesture({ onTap, onHoldStart, onHoldEnd });
    gesture.onPointerDown();
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
    gesture.onPointerDown();
    vi.advanceTimersByTime(HOLD_MS);
    expect(onHoldStart).toHaveBeenCalledTimes(1);
    gesture.onPointerUp();
    expect(onHoldEnd).toHaveBeenCalledTimes(1);
    expect(onTap).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("opens as a tap when the browser cancels the pointer before the hold", () => {
    const onTap = vi.fn();
    const gesture = createHoldGesture({ onTap, onHoldStart: vi.fn(), onHoldEnd: vi.fn() });
    gesture.onPointerDown();
    gesture.onPointerCancel();
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it("opens on click when pointer events never completed", () => {
    const onTap = vi.fn();
    const gesture = createHoldGesture({ onTap, onHoldStart: vi.fn(), onHoldEnd: vi.fn() });
    gesture.onClick();
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it("does not open twice when pointerup is followed by click", () => {
    const onTap = vi.fn();
    const gesture = createHoldGesture({ onTap, onHoldStart: vi.fn(), onHoldEnd: vi.fn() });
    gesture.onPointerDown();
    gesture.onPointerUp();
    gesture.onClick();
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it("ends a hold on cancel instead of treating it as a tap", () => {
    vi.useFakeTimers();
    const onTap = vi.fn();
    const onHoldEnd = vi.fn();
    const gesture = createHoldGesture({ onTap, onHoldStart: vi.fn(), onHoldEnd });
    gesture.onPointerDown();
    vi.advanceTimersByTime(HOLD_MS);
    gesture.onPointerCancel();
    expect(onHoldEnd).toHaveBeenCalledTimes(1);
    expect(onTap).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
