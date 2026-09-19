import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOwnTaskWork } from "./useOwnTaskWork";
import type { EmployeeTaskCard } from "../services/dashboardService";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "m1", preferred_language: "he" } }),
}));
vi.mock("../context/FeedbackContext", () => ({
  useFeedback: () => ({ showSuccess: vi.fn(), showError: vi.fn() }),
}));
vi.mock("../services/taskService", () => ({
  taskService: { start: vi.fn(), complete: vi.fn() },
}));

function task(): EmployeeTaskCard {
  return {
    id: "t1",
    title: "דוח",
    description: "",
    due_at: "2026-09-19T18:00:00+03:00",
    status: "pending",
    task_kind: "ad_hoc",
    photo_required: false,
    department_name: null,
    started_at: null,
  };
}

describe("useOwnTaskWork", () => {
  it("opens the menahel's own task in the detail dialog", () => {
    const { result } = renderHook(() => useOwnTaskWork(vi.fn()));
    act(() => result.current.open(task()));
    expect(result.current.detailTask?.id).toBe("t1");
    expect(result.current.capture).toBeTruthy();
  });

  it("closes the dialog and drops capture", () => {
    const { result } = renderHook(() => useOwnTaskWork(vi.fn()));
    act(() => result.current.open(task()));
    act(() => result.current.close());
    expect(result.current.detailTask).toBeNull();
    expect(result.current.capture).toBeUndefined();
  });
});
