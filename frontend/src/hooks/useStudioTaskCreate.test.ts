import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { NewTaskFormSubmitPayload } from "../components/tasks/NewTaskFormDialog";
import { taskService } from "../services/taskService";
import { useStudioTaskCreate } from "./useStudioTaskCreate";

const showSuccess = vi.fn();
vi.mock("../context/FeedbackContext", () => ({ useFeedback: () => ({ showSuccess, showError: vi.fn() }) }));
vi.mock("../services/taskService", () => ({ taskService: { createAdHoc: vi.fn(), createTemplate: vi.fn() } }));
vi.mock("../components/tasks/TaskReferenceMediaEditor", () => ({ resolveTaskReferenceMedia: vi.fn().mockResolvedValue({}) }));
vi.mock("../utils/resolveTaskCompletionGuides", () => ({ resolveTaskCompletionGuides: vi.fn(async (r: unknown) => r ?? []) }));

const base = {
  title: "ניקוי מקרר", description: "", branch_id: "b1", assignee_user_id: "u1", apply_to_network: false,
  recurrence: "daily", due_time: "09:00", weekly_days: "0,1,2,3,4", monthly_day: 1, media: {}, completion_requirements: [],
} as unknown as NewTaskFormSubmitPayload;

describe("useStudioTaskCreate", () => {
  beforeEach(() => {
    vi.mocked(taskService.createAdHoc).mockReset().mockResolvedValue({ message: "נוצרה", occurrence: { id: "o1" } } as never);
    vi.mocked(taskService.createTemplate).mockReset().mockResolvedValue({ message: "נוצרה", template: { id: "t1" } } as never);
    showSuccess.mockReset();
  });

  it("creates a one-time task with its date and the library model it comes from", async () => {
    const onCreated = vi.fn();
    const { result } = renderHook(() => useStudioTaskCreate(onCreated, "g1"));
    await act(() => result.current.submit({ ...base, task_kind: "ad_hoc", due_at: "2026-11-16T15:00" }));
    expect(taskService.createAdHoc).toHaveBeenCalledWith(expect.objectContaining({
      title: "ניקוי מקרר", branch_id: "b1", assignee_user_id: "u1",
      due_at: new Date("2026-11-16T15:00").toISOString(), source_gallery_item_id: "g1",
    }));
    expect(taskService.createTemplate).not.toHaveBeenCalled();
    expect(showSuccess).toHaveBeenCalledWith("נוצרה");
    expect(onCreated).toHaveBeenCalled();
  });

  it("creates a fixed task as before", async () => {
    const { result } = renderHook(() => useStudioTaskCreate(vi.fn()));
    await act(() => result.current.submit({ ...base, task_kind: "fixed", due_at: "" }));
    expect(taskService.createTemplate).toHaveBeenCalledWith(expect.objectContaining({ recurrence: "daily", due_time: "09:00" }));
    expect(taskService.createAdHoc).not.toHaveBeenCalled();
  });
});
