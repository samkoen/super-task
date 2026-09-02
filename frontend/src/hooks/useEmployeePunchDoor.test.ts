import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEmployeePunchDoor } from "./useEmployeePunchDoor";

const start = {
  id: "s",
  status: "pending",
  due_at: "2026-09-02T08:00:00+03:00",
  is_work_start: true,
};
const end = {
  id: "e",
  status: "pending",
  due_at: "2099-09-02T20:00:00+03:00",
  is_work_end: true,
};

describe("useEmployeePunchDoor", () => {
  it("shows only the start door while clock-in is still open", () => {
    const { result } = renderHook(() => useEmployeePunchDoor([start, end], false));
    expect(result.current.showStart).toBe(true);
    expect(result.current.showEnd).toBe(false);
  });

  it("opens the end door on request after clock-in is done", () => {
    const { result } = renderHook(() => useEmployeePunchDoor([end], false));
    expect(result.current.showEnd).toBe(false);
    act(() => {
      result.current.requestEnd();
    });
    expect(result.current.showEnd).toBe(true);
    act(() => {
      result.current.dismissEnd();
    });
    expect(result.current.showEnd).toBe(false);
  });
});
