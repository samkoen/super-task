import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { TASK_CHANGE_EVENT } from "../constants/events";
import {
  resolveTaskLivePollMs,
  shouldIgnoreTaskLiveEvent,
  subscribeTaskLiveRefresh,
  TASK_LIVE_POLL_MS,
  useTaskChangeListener,
} from "./useTaskChangeListener";

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

  it("refetches when the tab or app becomes visible", () => {
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

  it("polls while the tab is visible", () => {
    const onChange = vi.fn();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    const stop = subscribeTaskLiveRefresh(onChange, 25_000);
    vi.advanceTimersByTime(25_000);
    expect(onChange).toHaveBeenCalledTimes(1);
    stop();
  });
});

describe("task live poll helpers", () => {
  it("uses 25s by default including on native", () => {
    expect(resolveTaskLivePollMs()).toBe(TASK_LIVE_POLL_MS);
    expect(resolveTaskLivePollMs(false)).toBe(0);
    expect(resolveTaskLivePollMs(8_000)).toBe(8_000);
  });

  it("only ignores sse_connected", () => {
    expect(shouldIgnoreTaskLiveEvent({ type: "sse_connected" })).toBe(true);
    expect(shouldIgnoreTaskLiveEvent({ type: "manual_refresh" })).toBe(false);
    expect(shouldIgnoreTaskLiveEvent({ type: "task_created" })).toBe(false);
  });
});
