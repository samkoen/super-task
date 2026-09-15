import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import TaskCompletionReviewDialog from "./TaskCompletionReviewDialog";
import { he } from "../../i18n/he";
import { taskService, type TaskOccurrence } from "../../services/taskService";

vi.mock("../../services/taskService", () => ({
  taskService: {
    approve: vi.fn(),
    reopen: vi.fn(),
    reopenClosed: vi.fn(),
    confirmMedia: vi.fn(),
    postMessage: vi.fn(),
    uploadPhoto: vi.fn(),
  },
}));

vi.mock("./TaskChatPanel", () => ({
  default: ({
    composeEnabled,
    onOccurrenceUpdated,
  }: {
    composeEnabled?: boolean;
    onOccurrenceUpdated?: (status: string, notice?: string) => void;
  }) => (
    <div data-testid="task-chat-panel" data-compose={String(composeEnabled)}>
      {he.taskChatTitle}
      <button
        type="button"
        onClick={() => onOccurrenceUpdated?.("in_progress", he.taskChatSent)}
      >
        send-chat
      </button>
    </div>
  ),
}));

vi.mock("./TaskReferenceMediaDisplay", () => ({
  default: () => null,
}));

vi.mock("./CompletionMediaPreview", () => ({
  default: ({ onMarkPhoto }: { onMarkPhoto?: (url: string) => void }) => (
    <div data-testid="completion-preview">
      {onMarkPhoto ? (
        <button type="button" onClick={() => onMarkPhoto("/p.jpg")}>
          mark-photo
        </button>
      ) : null}
    </div>
  ),
}));

vi.mock("../chat/ChatPhotoAnnotateReplyDialog", () => ({
  default: ({
    photoUrl,
    onSend,
    submitLabel,
  }: {
    photoUrl: string | null;
    onSend: (file: File) => void;
    submitLabel?: string;
  }) =>
    photoUrl ? (
      <button
        type="button"
        onClick={() => onSend(new File(["x"], "marked.jpg", { type: "image/jpeg" }))}
      >
        {submitLabel ?? "send-mark"}
      </button>
    ) : null,
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
  vi.mocked(taskService.reopenClosed).mockReset();
  vi.mocked(taskService.confirmMedia).mockReset();
  vi.mocked(taskService.postMessage).mockReset();
  vi.mocked(taskService.uploadPhoto).mockReset();
  vi.mocked(taskService.confirmMedia).mockResolvedValue({ media_ready: false });
  vi.mocked(taskService.uploadPhoto).mockResolvedValue({ url: "/chat.jpg", kind: "photo" });
  vi.mocked(taskService.postMessage).mockResolvedValue({} as never);
});

describe("TaskCompletionReviewDialog", () => {
  it("keeps the window open after sending a chat message", () => {
    const onDone = vi.fn();
    const onClose = vi.fn();
    render(
      <TaskCompletionReviewDialog
        task={reviewTask({ status: "awaiting_response" })}
        onClose={onClose}
        onDone={onDone}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "send-chat" }));
    expect(screen.getByTestId("task-chat-panel")).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("places chat above completion media", () => {
    render(
      <TaskCompletionReviewDialog task={reviewTask()} onClose={vi.fn()} onDone={vi.fn()} />,
    );
    const chat = screen.getByTestId("task-chat-panel");
    const preview = screen.getByTestId("completion-preview");
    expect(chat.compareDocumentPosition(preview) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("lets the menahel write in the task chat during review", () => {
    render(
      <TaskCompletionReviewDialog task={reviewTask()} onClose={vi.fn()} onDone={vi.fn()} />,
    );
    expect(screen.getByTestId("task-chat-panel").getAttribute("data-compose")).toBe("true");
  });

  it("drops review actions when chat moves the task back in progress", () => {
    render(
      <TaskCompletionReviewDialog task={reviewTask()} onClose={vi.fn()} onDone={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: he.taskApproveClose })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "send-chat" }));
    expect(screen.queryByRole("button", { name: he.taskApproveClose })).toBeNull();
    expect(screen.queryByRole("button", { name: he.taskReopen })).toBeNull();
  });

  it("keeps the task chat read-only after the task is closed", () => {
    render(
      <TaskCompletionReviewDialog
        task={reviewTask({ status: "completed" })}
        onClose={vi.fn()}
        onDone={vi.fn()}
      />,
    );
    expect(screen.getByTestId("task-chat-panel")).toBeTruthy();
    expect(screen.getByTestId("task-chat-panel").getAttribute("data-compose")).toBe("false");
  });

  it("approves with the default four-star rating", async () => {
    vi.mocked(taskService.approve).mockResolvedValue({} as never);
    const onDone = vi.fn();
    const onClose = vi.fn();
    render(
      <TaskCompletionReviewDialog task={reviewTask()} onClose={onClose} onDone={onDone} />,
    );
    expect(screen.getByRole("radio", { name: he.qualityStarLabel(4) }).getAttribute("aria-checked")).toBe(
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: he.taskApproveClose }));
    await waitFor(() => {
      expect(taskService.approve).toHaveBeenCalledWith("occ-1", { quality_rating: 4 });
      expect(onDone).toHaveBeenCalledWith(he.taskApprovedSuccess);
      expect(onClose).toHaveBeenCalled();
    });
    expect(taskService.reopen).not.toHaveBeenCalled();
  });

  it("shows when the oved sent the task without finishing", () => {
    render(
      <TaskCompletionReviewDialog
        task={reviewTask({
          completion: {
            id: "c1",
            occurrence_id: "occ-1",
            status: "not_completed",
            note: null,
            photo_path: null,
            video_path: null,
            audio_path: null,
            not_completed_reason: "אין מה לצלם",
            completed_by_id: "u1",
            completed_at: "2026-08-25T12:00:00+03:00",
            manager_review_status: "pending",
          },
        })}
        onClose={vi.fn()}
        onDone={vi.fn()}
      />,
    );
    expect(screen.getByTestId("completion-outcome-not-done")).toBeTruthy();
    expect(screen.getByText(he.taskNotCompletedAlert)).toBeTruthy();
    expect(screen.getByText(`${he.notCompletedReason}: אין מה לצלם`)).toBeTruthy();
  });

  it("blocks approve and reject while the video is still mounting", () => {
    render(
      <TaskCompletionReviewDialog
        task={reviewTask({
          completion: {
            ...reviewTask().completion!,
            video_path: "/v.mp4",
            media_ready: false,
          },
        })}
        onClose={vi.fn()}
        onDone={vi.fn()}
      />,
    );
    expect(screen.getByText(he.reviewVideosNotReady)).toBeTruthy();
    expect(screen.getByRole("button", { name: he.taskApproveClose })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: he.taskReopen })).toHaveProperty("disabled", true);
  });

  it("reopens with a fallback remark when the note is empty", async () => {
    vi.mocked(taskService.reopen).mockResolvedValue({} as never);
    const onDone = vi.fn();
    render(
      <TaskCompletionReviewDialog task={reviewTask()} onClose={vi.fn()} onDone={onDone} />,
    );
    fireEvent.click(screen.getByRole("button", { name: he.taskReopen }));
    await waitFor(() => {
      expect(taskService.reopen).toHaveBeenCalledWith("occ-1", {
        rejection_note: he.taskReopenNoteFallback,
      });
      expect(onDone).toHaveBeenCalledWith(he.taskReopenedSuccess);
    });
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

  it("shows completion media for a closed task that is not approved", () => {
    render(
      <TaskCompletionReviewDialog
        task={reviewTask({
          status: "completed",
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
            manager_review_status: null,
          },
        })}
        onClose={vi.fn()}
        onDone={vi.fn()}
      />,
    );
    expect(screen.getByTestId("completion-preview")).toBeTruthy();
    expect(screen.getByTestId("completion-outcome-done")).toBeTruthy();
    expect(screen.queryByRole("button", { name: he.taskReopenClosed })).toBeNull();
  });

  it("reopens a closed approved task after confirmation", async () => {
    vi.mocked(taskService.reopenClosed).mockResolvedValue({} as never);
    const onDone = vi.fn();
    const onClose = vi.fn();
    render(
      <TaskCompletionReviewDialog
        task={reviewTask({
          status: "completed",
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
            manager_review_status: "approved",
          },
        })}
        onClose={onClose}
        onDone={onDone}
      />,
    );
    expect(screen.queryByRole("button", { name: he.taskApproveClose })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: he.taskReopenClosed }));
    expect(taskService.reopenClosed).not.toHaveBeenCalled();
    expect(screen.getByText(he.taskReopenClosedConfirm)).toBeTruthy();
    const confirmButtons = screen.getAllByRole("button", { name: he.taskReopenClosed });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);
    await waitFor(() => {
      expect(taskService.reopenClosed).toHaveBeenCalledWith("occ-1");
      expect(onDone).toHaveBeenCalledWith(he.taskReopenedSuccess);
      expect(onClose).toHaveBeenCalled();
    });
    expect(taskService.approve).not.toHaveBeenCalled();
  });

  it("sends marked photos in chat when reopening, not on approve", async () => {
    vi.mocked(taskService.reopen).mockResolvedValue({} as never);
    vi.mocked(taskService.approve).mockResolvedValue({} as never);
    const onDone = vi.fn();
    const { rerender } = render(
      <TaskCompletionReviewDialog task={reviewTask()} onClose={vi.fn()} onDone={onDone} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "mark-photo" }));
    fireEvent.click(screen.getByText(he.reviewMarkPhotoSave));
    fireEvent.click(screen.getByRole("button", { name: he.taskReopen }));
    await waitFor(() => {
      expect(taskService.postMessage).toHaveBeenCalledWith("occ-1", {
        photo_url: "/chat.jpg",
        body: he.taskReopenNoteFallback,
      });
      expect(taskService.reopen).not.toHaveBeenCalled();
      expect(onDone).toHaveBeenCalledWith(he.taskReopenedSuccess);
    });

    rerender(
      <TaskCompletionReviewDialog task={reviewTask()} onClose={vi.fn()} onDone={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "mark-photo" }));
    fireEvent.click(screen.getByText(he.reviewMarkPhotoSave));
    fireEvent.click(screen.getByRole("button", { name: he.taskApproveClose }));
    await waitFor(() => {
      expect(taskService.approve).toHaveBeenCalled();
    });
    expect(taskService.postMessage).toHaveBeenCalledTimes(1);
  });
});
