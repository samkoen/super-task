import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { ApiError } from "../services/api";
import { taskService } from "../services/taskService";
import { useEmployeeDayTasks } from "./useEmployeeDayTasks";

const feedback = { showError: vi.fn(), showSuccess: vi.fn() };
vi.mock("../context/FeedbackContext", () => ({ useFeedback: () => feedback }));
vi.mock("./useTaskChangeListener", () => ({ useTaskChangeListener: () => undefined }));
vi.mock("../services/taskService", () => ({ taskService: { listOccurrences: vi.fn() } }));

describe("useEmployeeDayTasks", () => {
  beforeEach(() => {
    feedback.showError.mockReset();
    vi.mocked(taskService.listOccurrences).mockReset().mockResolvedValue([
      { id: "t1", assignee_user_id: "u1" }, { id: "t2", assignee_user_id: "u2" },
    ] as never);
  });

  it("loads the day of the snif and keeps only the oved's tasks", async () => {
    const { result } = renderHook(() => useEmployeeDayTasks("u1", "b1", "2026-11-16"));
    await waitFor(() => expect(result.current.tasks.map((t) => t.id)).toEqual(["t1"]));
    expect(taskService.listOccurrences).toHaveBeenCalledWith({ branch_id: "b1", due_on: "2026-11-16" });
  });

  it("looks at the whole network when no snif is given", async () => {
    renderHook(() => useEmployeeDayTasks("u1", "", "2026-11-16"));
    await waitFor(() => expect(taskService.listOccurrences).toHaveBeenCalledWith({ branch_id: undefined, due_on: "2026-11-16" }));
  });

  it("loads nothing while the sheet is closed", async () => {
    const { result } = renderHook(() => useEmployeeDayTasks("", "b1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(taskService.listOccurrences).not.toHaveBeenCalled();
    expect(result.current.tasks).toEqual([]);
  });

  it("shows the server error", async () => {
    vi.mocked(taskService.listOccurrences).mockRejectedValue(new ApiError("שגיאה", 500));
    const { result } = renderHook(() => useEmployeeDayTasks("u1", "b1"));
    await waitFor(() => expect(feedback.showError).toHaveBeenCalledWith("שגיאה"));
    expect(result.current.loading).toBe(false);
  });
});
