import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { ApiError } from "../services/api";
import { taskService, type TaskOccurrence } from "../services/taskService";
import { he } from "../i18n/he";
import { useManagerTaskActions } from "./useManagerTaskActions";

// Fonctions stables comme dans l'app : un objet neuf à chaque rendu relancerait les effets sans fin.
const feedback = { showSuccess: vi.fn(), showError: vi.fn() };
vi.mock("../context/FeedbackContext", () => ({ useFeedback: () => feedback }));
vi.mock("../services/taskService", () => ({ taskService: { cancel: vi.fn(), setManagerNext: vi.fn() } }));

const occ = (id: string, status: TaskOccurrence["status"], hour = 9, patch: Partial<TaskOccurrence> = {}) =>
  ({ id, title: id, status, due_at: new Date(2026, 10, 16, hour).toISOString(), ...patch }) as TaskOccurrence;

function setup(canPickBranch = false, networkIds = new Set<string>()) {
  const reload = vi.fn().mockResolvedValue(undefined);
  const hook = renderHook(() => useManagerTaskActions({ canPickBranch, networkIds, reload }));
  return { reload, result: hook.result };
}

describe("useManagerTaskActions", () => {
  beforeEach(() => {
    feedback.showSuccess.mockReset();
    feedback.showError.mockReset();
    vi.mocked(taskService.cancel).mockReset().mockResolvedValue({ deleted_count: 1 } as never);
    vi.mocked(taskService.setManagerNext).mockReset().mockResolvedValue({ message: "" } as never);
  });

  it("opens the full-screen review on the proofs of the list, in the order of the day", () => {
    const { result } = setup();
    const list = [occ("p2", "pending_review", 13), occ("x", "pending"), occ("p1", "pending_review", 8)];
    act(() => result.current.open(list[0], list));
    expect(result.current.reviewRequest).toEqual({ startId: "p2", queue: [{ id: "p1", title: "p1" }, { id: "p2", title: "p2" }] });
  });

  it("opens the summary of a closed task and the sheet of an open one", () => {
    const { result } = setup();
    act(() => result.current.open(occ("done", "completed"), []));
    expect(result.current.summaryTask?.id).toBe("done");
    act(() => result.current.open(occ("todo", "pending"), []));
    expect(result.current.editId).toBe("todo");
  });

  it("asks before deleting, then deletes and reloads", async () => {
    const { result, reload } = setup();
    act(() => result.current.open(occ("todo", "pending"), []));
    act(() => result.current.askDelete(occ("todo", "pending")));
    expect(result.current.editId).toBeNull();
    expect(result.current.del.deleting?.id).toBe("todo");
    expect(result.current.del.networkWide).toBe(false);
    await act(() => result.current.del.confirm());
    expect(taskService.cancel).toHaveBeenCalledWith("todo", false);
    expect(feedback.showSuccess).toHaveBeenCalledWith(he.managerAdHocDeletedNetwork(1));
    expect(reload).toHaveBeenCalled();
    expect(result.current.del.deleting).toBeNull();
  });

  it("offers to delete a network-wide one-time task in every snif", () => {
    const task = occ("net", "pending", 9, { task_kind: "ad_hoc", network_group_id: "g1" });
    const { result } = setup(true, new Set(["net"]));
    act(() => result.current.askDelete(task));
    expect(result.current.del.networkWide).toBe(true);
  });

  it("shows the server error when the next-task mark fails", async () => {
    vi.mocked(taskService.setManagerNext).mockRejectedValue(new ApiError("אסור", 403));
    const { result, reload } = setup();
    await act(() => result.current.setManagerNext(occ("todo", "pending"), true));
    expect(feedback.showError).toHaveBeenCalledWith("אסור");
    expect(reload).not.toHaveBeenCalled();
  });

  it("marks the next task and reloads quietly", async () => {
    const { result, reload } = setup();
    await act(() => result.current.setManagerNext(occ("todo", "pending"), true));
    await waitFor(() => expect(reload).toHaveBeenCalledWith(true));
    expect(feedback.showSuccess).toHaveBeenCalledWith(he.managerNextTaskSet);
  });
});
