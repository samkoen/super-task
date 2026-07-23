import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { NOTIFICATION_EVENT, TASK_CHANGE_EVENT } from "../constants/events";
import {
  resolveTaskChatPollMs,
  shouldRefreshTaskChat,
  useTaskChatLiveSync,
  DEFAULT_TASK_CHAT_POLL_MS,
} from "./useTaskChatLiveSync";

describe("resolveTaskChatPollMs", () => {
  it("defaults to 10 seconds", () => {
    expect(resolveTaskChatPollMs()).toBe(DEFAULT_TASK_CHAT_POLL_MS);
    expect(DEFAULT_TASK_CHAT_POLL_MS).toBe(10_000);
  });

  it("accepts override and false", () => {
    expect(resolveTaskChatPollMs(5_000)).toBe(5_000);
    expect(resolveTaskChatPollMs(false)).toBe(0);
  });
});

describe("shouldRefreshTaskChat", () => {
  it("ignores sse_connected and other occurrences", () => {
    expect(shouldRefreshTaskChat({ type: "sse_connected" }, "occ-1")).toBe(false);
    expect(
      shouldRefreshTaskChat({ type: "task_updated", occurrence_id: "other" }, "occ-1"),
    ).toBe(false);
  });

  it("refreshes for matching occurrence or chat kinds", () => {
    expect(
      shouldRefreshTaskChat(
        { type: "task_message_manager", occurrence_id: "occ-1" },
        "occ-1",
      ),
    ).toBe(true);
    expect(
      shouldRefreshTaskChat({ type: "notification", kind: "task_message_employee" }, "occ-1"),
    ).toBe(true);
    expect(
      shouldRefreshTaskChat({ type: "task_updated", occurrence_id: "occ-1" }, "occ-1"),
    ).toBe(true);
  });
});

describe("useTaskChatLiveSync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces SSE chat events into onRefresh", () => {
    const onRefresh = vi.fn();
    renderHook(() => useTaskChatLiveSync("occ-1", onRefresh, { pollMs: false }));

    window.dispatchEvent(
      new CustomEvent(TASK_CHANGE_EVENT, {
        detail: { type: "task_message_manager", occurrence_id: "occ-1" },
      }),
    );
    window.dispatchEvent(
      new CustomEvent(NOTIFICATION_EVENT, {
        detail: { type: "notification", kind: "task_message_manager" },
      }),
    );
    expect(onRefresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(250);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("polls every configured interval", () => {
    const onRefresh = vi.fn();
    renderHook(() => useTaskChatLiveSync("occ-1", onRefresh, { pollMs: 10_000 }));

    vi.advanceTimersByTime(9_999);
    expect(onRefresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(10_000);
    expect(onRefresh).toHaveBeenCalledTimes(2);
  });

  it("skips events for another occurrence", () => {
    const onRefresh = vi.fn();
    renderHook(() => useTaskChatLiveSync("occ-1", onRefresh, { pollMs: false }));

    window.dispatchEvent(
      new CustomEvent(TASK_CHANGE_EVENT, {
        detail: { type: "task_message_manager", occurrence_id: "occ-2" },
      }),
    );
    vi.advanceTimersByTime(250);
    expect(onRefresh).not.toHaveBeenCalled();
  });
});
