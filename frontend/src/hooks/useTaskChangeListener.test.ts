import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { TASK_CHANGE_EVENT } from "../constants/events";

vi.mock("../utils/isNativeApp", () => ({
  isNativeApp: () => false,
}));

import { useTaskChangeListener } from "./useTaskChangeListener";

describe("useTaskChangeListener", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces SSE task-change events into onChange", () => {
    const onChange = vi.fn();
    renderHook(() => useTaskChangeListener(onChange, { pollMs: false }));

    window.dispatchEvent(new CustomEvent(TASK_CHANGE_EVENT));
    window.dispatchEvent(new CustomEvent(TASK_CHANGE_EVENT));
    expect(onChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("refetches when the tab becomes visible", () => {
    const onChange = vi.fn();
    renderHook(() => useTaskChangeListener(onChange, { pollMs: false }));

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    vi.advanceTimersByTime(300);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("ignores sse_connected so reconnect storms do not reload the list", () => {
    const onChange = vi.fn();
    renderHook(() => useTaskChangeListener(onChange, { pollMs: false }));

    window.dispatchEvent(
      new CustomEvent(TASK_CHANGE_EVENT, { detail: { type: "sse_connected" } })
    );
    vi.advanceTimersByTime(300);
    expect(onChange).not.toHaveBeenCalled();
  });
});
