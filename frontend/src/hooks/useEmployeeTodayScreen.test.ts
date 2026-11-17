import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useEmployeeTodayScreen, usePublishEmployeeTodayScreen } from "./useEmployeeTodayScreen";
import {
  getEmployeeTodayScreen,
  setEmployeeTodayScreen,
  subscribeEmployeeTodayScreen,
} from "../utils/employeeTodayScreenStore";

describe("employee today screen store", () => {
  afterEach(() => {
    setEmployeeTodayScreen(false);
  });

  it("is hidden by default and follows the store", () => {
    const { result } = renderHook(() => useEmployeeTodayScreen());
    expect(result.current).toBe(false);
    act(() => setEmployeeTodayScreen(true));
    expect(result.current).toBe(true);
  });

  it("notifies listeners only on real changes and stops after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeEmployeeTodayScreen(listener);
    setEmployeeTodayScreen(true);
    setEmployeeTodayScreen(true);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    setEmployeeTodayScreen(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("publishes the flag and resets it on unmount", () => {
    const reader = renderHook(() => useEmployeeTodayScreen());
    const publisher = renderHook(({ shown }) => usePublishEmployeeTodayScreen(shown), {
      initialProps: { shown: true },
    });
    expect(reader.result.current).toBe(true);
    publisher.rerender({ shown: false });
    expect(reader.result.current).toBe(false);
    publisher.rerender({ shown: true });
    expect(getEmployeeTodayScreen()).toBe(true);
    publisher.unmount();
    expect(reader.result.current).toBe(false);
  });
});
