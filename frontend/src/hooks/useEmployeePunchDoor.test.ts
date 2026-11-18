import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
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
const shelf = {
  id: "t",
  status: "pending",
  due_at: "2026-09-02T12:00:00+03:00",
};

describe("useEmployeePunchDoor", () => {
  it("shows only the start door while clock-in is still open", () => {
    const { result } = renderHook(() => useEmployeePunchDoor([start, end, shelf], false));
    expect(result.current.showStart).toBe(true);
    expect(result.current.showEnd).toBe(false);
  });

  it("stays on the task list until the other work is done", () => {
    const { result } = renderHook(() => useEmployeePunchDoor([end, shelf], false));
    expect(result.current.showStart).toBe(false);
    expect(result.current.showEnd).toBe(false);
  });

  it("shows the exit screen once no work task remains", () => {
    const { result } = renderHook(() => useEmployeePunchDoor([end], false));
    expect(result.current.showEnd).toBe(true);
  });

  it("does not bring the start door back once clock-in is finished offline and waiting to upload", () => {
    const { result } = renderHook(() => useEmployeePunchDoor([start, end, shelf], false, new Set(["s"])));
    expect(result.current.showStart).toBe(false);
    expect(result.current.start).toBeNull();
  });

  it("counts a work task waiting to upload as done for the exit screen", () => {
    const { result } = renderHook(() => useEmployeePunchDoor([end, shelf], false, new Set(["t"])));
    expect(result.current.showEnd).toBe(true);
  });
});
