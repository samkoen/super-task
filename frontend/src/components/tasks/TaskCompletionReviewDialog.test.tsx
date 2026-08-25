import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import TaskCompletionReviewDialog from "./TaskCompletionReviewDialog";
import { he } from "../../i18n/he";
import { taskService, type TaskOccurrence } from "../../services/taskService";

vi.mock("../../services/taskService", () => ({
  taskService: {
    approve: vi.fn(),
    reopen: vi.fn(),
  },
}));

vi.mock("./TaskChatPanel", () => ({
  default: () => <div data-testid="task-chat-panel">{he.taskChatTitle}</div>,
}));

vi.mock("./TaskReferenceMediaDisplay", () => ({
  default: () => null,
}));

vi.mock("./CompletionMediaPreview", () => ({
  default: () => <div data-testid="completion-preview" />,
}));

function reviewTask(over: Partial<TaskOccurrence> = {}): TaskOccurrence {
  return {
    id: "occ-1",
    template_id: null,
    branch_id: "b1",
    title: "צילום מדף",
    description: "",
    due_at: "2026-08-25T18:00:00+03:00",
    status: "pending_review",
    assignee_user_id: "u1",
    department_id: null,
    task_kind: "ad_hoc",
    manager_user_id: "m1",
    photo_required: true,
    started_at: "2026-08-25T10:00:00+03:00",
    created_at: "2026-08-25T08:00:00+03:00",
    updated_at: "2026-08-25T12:00:00+03:00",
    completion: {
      id: "c1",
      occurrence_id: "occ-1",
      status: "completed",
      note: "בוצע",
      photo_path: "/p.jpg",
      video_path: null,
      audio_path: null,
      not_completed_reason: null,
      completed_by_id: "u1",
      completed_at: "2026-08-25T12:00:00+03:00",
      manager_review_status: "pending",
    },
    ...over,
  };
}

beforeEach(() => {
  vi.mocked(taskService.approve).mockReset();
  vi.mocked(taskService.reopen).mockReset();
});

describe("TaskCompletionReviewDialog", () => {
  it("approves and closes the task", async () => {
    vi.mocked(taskService.approve).mockResolvedValue({} as never);
    const onDone = vi.fn();
    const onClose = vi.fn();
    render(
      <TaskCompletionReviewDialog task={reviewTask()} onClose={onClose} onDone={onDone} />,
    );
    fireEvent.click(screen.getByRole("button", { name: he.taskApproveClose }));
    await waitFor(() => {
      expect(taskService.approve).toHaveBeenCalledWith("occ-1");
      expect(onDone).toHaveBeenCalledWith(he.taskApprovedSuccess);
      expect(onClose).toHaveBeenCalled();
    });
    expect(taskService.reopen).not.toHaveBeenCalled();
  });

  it("blocks reopen without a remark", () => {
    const onDone = vi.fn();
    render(
      <TaskCompletionReviewDialog task={reviewTask()} onClose={vi.fn()} onDone={onDone} />,
    );
    fireEvent.click(screen.getByRole("button", { name: he.taskReopen }));
    expect(screen.getByText(he.taskReopenNoteRequired)).toBeTruthy();
    expect(taskService.reopen).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it("reopens the task with the manager remark", async () => {
    vi.mocked(taskService.reopen).mockResolvedValue({} as never);
    const onDone = vi.fn();
    const onClose = vi.fn();
    render(
      <TaskCompletionReviewDialog task={reviewTask()} onClose={onClose} onDone={onDone} />,
    );
    fireEvent.change(screen.getByLabelText(he.taskReopenNote), {
      target: { value: "תקן את התמונה" },
    });
    fireEvent.click(screen.getByRole("button", { name: he.taskReopen }));
    await waitFor(() => {
      expect(taskService.reopen).toHaveBeenCalledWith("occ-1", {
        rejection_note: "תקן את התמונה",
      });
      expect(onDone).toHaveBeenCalledWith(he.taskReopenedSuccess);
      expect(onClose).toHaveBeenCalled();
    });
    expect(taskService.approve).not.toHaveBeenCalled();
  });
});
