import { describe, expect, it, vi } from "vitest";
import { runPullRefresh } from "./usePullToRefresh";

describe("runPullRefresh", () => {
  it("toggles refreshing then resets delta", async () => {
    const setRefreshing = vi.fn();
    const setDelta = vi.fn();
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    await runPullRefresh(onRefresh, setRefreshing, setDelta);
    expect(setRefreshing.mock.calls).toEqual([[true], [false]]);
    expect(setDelta).toHaveBeenCalledWith(0);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("resets even when onRefresh throws", async () => {
    const setRefreshing = vi.fn();
    const setDelta = vi.fn();
    await expect(
      runPullRefresh(() => Promise.reject(new Error("fail")), setRefreshing, setDelta),
    ).rejects.toThrow("fail");
    expect(setRefreshing).toHaveBeenLastCalledWith(false);
    expect(setDelta).toHaveBeenCalledWith(0);
  });
});
