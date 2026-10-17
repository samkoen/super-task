import { afterEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { usePublishEmployeeStartDoor, useEmployeeStartDoorOpen } from "./useEmployeeStartDoorOpen";
import { getEmployeeStartDoorOpen, setEmployeeStartDoorOpen } from "../utils/employeeStartDoorStore";

describe("employee start door store", () => {
  afterEach(() => {
    setEmployeeStartDoorOpen(false);
  });

  it("is closed by default and follows the store", () => {
    const { result } = renderHook(() => useEmployeeStartDoorOpen());
    expect(result.current).toBe(false);
    act(() => setEmployeeStartDoorOpen(true));
    expect(result.current).toBe(true);
  });

  it("publishes the flag and resets it on unmount", () => {
    const reader = renderHook(() => useEmployeeStartDoorOpen());
    const publisher = renderHook(({ open }) => usePublishEmployeeStartDoor(open), {
      initialProps: { open: true },
    });
    expect(reader.result.current).toBe(true);
    publisher.rerender({ open: false });
    expect(reader.result.current).toBe(false);
    publisher.rerender({ open: true });
    expect(getEmployeeStartDoorOpen()).toBe(true);
    publisher.unmount();
    expect(reader.result.current).toBe(false);
  });
});
