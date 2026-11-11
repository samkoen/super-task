import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSlotAutoFlush } from "./useSlotAutoFlush";

function fakeQueue() {
  return { flush: vi.fn(async () => undefined) } as never;
}

describe("useSlotAutoFlush", () => {
  it("flushes the device queue on start and again when the network comes back", () => {
    const queue = fakeQueue() as { flush: ReturnType<typeof vi.fn> };
    renderHook(() => useSlotAutoFlush(true, () => queue as never));
    expect(queue.flush).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new Event("online"));
    expect(queue.flush).toHaveBeenCalledTimes(2);
  });

  it("does nothing while disabled", () => {
    const queue = fakeQueue() as { flush: ReturnType<typeof vi.fn> };
    renderHook(() => useSlotAutoFlush(false, () => queue as never));
    window.dispatchEvent(new Event("online"));
    expect(queue.flush).not.toHaveBeenCalled();
  });

  it("stops listening on unmount", () => {
    const queue = fakeQueue() as { flush: ReturnType<typeof vi.fn> };
    const { unmount } = renderHook(() => useSlotAutoFlush(true, () => queue as never));
    unmount();
    window.dispatchEvent(new Event("online"));
    expect(queue.flush).toHaveBeenCalledTimes(1);
  });
});
