import { forwardRef, useImperativeHandle } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import TaskCompletionReviewDialog from "./TaskCompletionReviewDialog";
import { he } from "../../i18n/he";
import { taskService, type TaskOccurrence } from "../../services/taskService";

vi.mock("../../services/taskService", () => ({
  taskService: {
    approve: vi.fn(),
    reopen: vi.fn(),
    reopenClosed: vi.fn(),
    reviewSlots: vi.fn(),
    confirmMedia: vi.fn(),
    postMessage: vi.fn(),
    uploadPhoto: vi.fn(),
  },
}));
vi.mock("./TaskChatDialog", () => ({ OpenTaskChatButton: () => null }));
vi.mock("./TaskReferenceMediaDisplay", () => ({ default: () => null }));
vi.mock("./CompletionExampleDialog", () => ({ default: () => null }));
vi.mock("../chat/ChatPhotoAnnotateReplyDialog", () => ({ default: () => null }));
vi.mock("./review/SlotMedia", () => ({
  default: ({ title }: { title: string }) => <div data-testid="slot-media">{title}</div>,
}));
vi.mock("../media/PhotoAnnotationCanvas", () => ({
  default: forwardRef((_props: unknown, ref) => {
    useImperativeHandle(ref, () => ({
      hasAnnotations: () => true,
      exportFile: async () => new File(["marked"], "marked.jpg", { type: "image/jpeg" }),
    }));
    return <div data-testid="annotation-canvas" />;
  }),
}));
vi.mock("../../hooks/useResolvedMediaSrc", () => ({
  useResolvedMediaSrc: (path: string | null) => ({ src: path, loading: false, failed: false, onError: () => {} }),
}));

function subtaskTask(over: Partial<TaskOccurrence> = {}): TaskOccurrence {
  return {
    id: "occ-1",
    template_id: null,
    branch_id: "b1",
    title: "בדיקת מדפים",
    description: "",
    due_at: "2026-08-25T18:00:00+03:00",
    status: "pending_review",
    assignee_user_id: "u1",
    department_id: null,
    task_kind: "ad_hoc",
    manager_user_id: "m1",
    photo_required: false,
    started_at: "2026-08-25T10:00:00+03:00",
    created_at: "2026-08-25T08:00:00+03:00",
    updated_at: "2026-08-25T12:00:00+03:00",
    completion_requirements: [
      { kind: "photo", title: "מדף" },
      { kind: "photo", title: "מקרר" },
    ],
    completion: {
      id: "c1",
      occurrence_id: "occ-1",
      status: "completed",
      note: null,
      photo_path: "/a.jpg",
      video_path: null,
      audio_path: null,
      completion_attachments: [
        { kind: "photo", url: "/a.jpg" },
        { kind: "photo", url: "/b.jpg" },
      ],
      not_completed_reason: null,
      completed_by_id: "u1",
      completed_at: "2026-08-25T12:00:00+03:00",
      manager_review_status: "pending",
    },
    ...over,
  } as TaskOccurrence;
}

function cards() {
  return screen.getAllByTestId("slot-review-card");
}

function verdict(card: HTMLElement, label: string) {
  return within(card).getByRole("button", { name: new RegExp(`^${label}`) });
}

async function remarkClosed() {
  await waitFor(() => expect(screen.queryAllByRole("dialog", { hidden: true })).toHaveLength(1), { timeout: 3000 });
}

function renderDialog(task = subtaskTask()) {
  const onDone = vi.fn();
  const onClose = vi.fn();
  render(<TaskCompletionReviewDialog task={task} onClose={onClose} onDone={onDone} />);
  return { onDone, onClose };
}

beforeEach(() => {
  vi.mocked(taskService.reviewSlots).mockReset();
  vi.mocked(taskService.uploadPhoto).mockReset();
  vi.mocked(taskService.confirmMedia).mockReset();
  vi.mocked(taskService.confirmMedia).mockResolvedValue({ media_ready: true });
  vi.mocked(taskService.uploadPhoto).mockResolvedValue({ url: "/uploads/marked.jpg", kind: "photo" });
  vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:marked"), revokeObjectURL: vi.fn() });
});

describe("TaskCompletionReviewDialog — V/X per sub-task", () => {
  it("shows one card per sub-task and blocks the finish until each has a V or an X", () => {
    renderDialog();
    expect(cards()).toHaveLength(2);
    expect(screen.getByText(he.slotReviewProgress(0, 2))).toBeTruthy();
    const finish = screen.getByRole("button", { name: he.slotReviewFinishApprove });
    expect(finish).toHaveProperty("disabled", true);
    expect(screen.getByText(he.slotReviewRemaining(2))).toBeTruthy();
    fireEvent.click(verdict(cards()[0], he.slotReviewApprove));
    expect(screen.getByText(he.slotReviewProgress(1, 2))).toBeTruthy();
    expect(finish).toHaveProperty("disabled", true);
    expect(taskService.reviewSlots).not.toHaveBeenCalled();
  });

  it("closes the task automatically when every sub-task is a V", async () => {
    vi.mocked(taskService.reviewSlots).mockResolvedValue({ outcome: "approved" } as never);
    const { onDone, onClose } = renderDialog();
    fireEvent.click(verdict(cards()[0], he.slotReviewApprove));
    fireEvent.click(verdict(cards()[1], he.slotReviewApprove));
    expect(screen.getByText(he.slotReviewOutcomeApprove)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: he.slotReviewFinishApprove }));
    await waitFor(() => {
      expect(taskService.reviewSlots).toHaveBeenCalledWith("occ-1", {
        decisions: [
          { index: 0, status: "approved" },
          { index: 1, status: "approved" },
        ],
        quality_rating: 4,
      });
      expect(onDone).toHaveBeenCalledWith(he.taskApprovedSuccess);
      expect(onClose).toHaveBeenCalled();
    });
    expect(taskService.approve).not.toHaveBeenCalled();
  });

  it("marks everything as V in one tap", () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: he.slotReviewApproveAll }));
    expect(cards().map((card) => card.getAttribute("data-status"))).toEqual(["approved", "approved"]);
    expect(screen.queryByRole("button", { name: he.slotReviewApproveAll })).toBeNull();
  });

  it("opens the remark window on X and reopens the task with the remark and the marked image", async () => {
    vi.mocked(taskService.reviewSlots).mockResolvedValue({ outcome: "rejected" } as never);
    const { onDone } = renderDialog();
    fireEvent.click(verdict(cards()[0], he.slotReviewApprove));
    fireEvent.click(verdict(cards()[1], he.slotReviewReject));
    expect(screen.getByTestId("annotation-canvas")).toBeTruthy();
    fireEvent.change(screen.getByLabelText(he.slotRemarkLabel), { target: { value: "  צלם מקרוב  " } });
    fireEvent.click(screen.getByRole("button", { name: he.slotRemarkSave }));

    await waitFor(() => expect(cards()[1].getAttribute("data-status")).toBe("rejected"));
    await remarkClosed();
    const remark = within(cards()[1]).getByTestId("slot-remark");
    expect(within(remark).getByText("צלם מקרוב")).toBeTruthy();
    expect(screen.getByText(he.slotReviewOutcomeReopen(1))).toBeTruthy();
    expect(screen.queryByRole("radio", { name: he.qualityStarLabel(4) })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: he.slotReviewFinishReopen }));
    await waitFor(() => {
      expect(taskService.uploadPhoto).toHaveBeenCalledTimes(1);
      expect(taskService.reviewSlots).toHaveBeenCalledWith("occ-1", {
        decisions: [
          { index: 0, status: "approved" },
          { index: 1, status: "rejected", remark: "צלם מקרוב", annotated_url: "/uploads/marked.jpg" },
        ],
      });
      expect(onDone).toHaveBeenCalledWith(he.taskReopenedSuccess);
    });
  });

  it("does not record an X when the remark window is cancelled", () => {
    renderDialog();
    fireEvent.click(verdict(cards()[0], he.slotReviewReject));
    fireEvent.click(screen.getAllByRole("button", { name: he.cancel }).at(-1)!);
    expect(cards()[0].getAttribute("data-status")).toBe("none");
  });

  it("lets the menahel switch an X back to a V", async () => {
    renderDialog();
    fireEvent.click(verdict(cards()[0], he.slotReviewReject));
    fireEvent.click(screen.getByRole("button", { name: he.slotRemarkSave }));
    await waitFor(() => expect(cards()[0].getAttribute("data-status")).toBe("rejected"));
    await remarkClosed();
    fireEvent.click(verdict(cards()[0], he.slotReviewApprove));
    expect(cards()[0].getAttribute("data-status")).toBe("approved");
  });

  it("keeps a V given in a previous round", () => {
    const base = subtaskTask();
    renderDialog(
      subtaskTask({
        completion: {
          ...base.completion!,
          completion_attachments: [
            { kind: "photo", url: "/a.jpg", review: { status: "approved" } },
            { kind: "photo", url: "/b2.jpg" },
          ],
        },
      }),
    );
    expect(cards().map((card) => card.getAttribute("data-status"))).toEqual(["approved", "none"]);
    expect(within(cards()[0]).getByText(he.slotReviewPreviouslyApproved)).toBeTruthy();
    expect(screen.getByText(he.slotReviewProgress(1, 2))).toBeTruthy();
  });

  it("blocks V and X while a video is still loading", () => {
    const base = subtaskTask();
    renderDialog(
      subtaskTask({
        completion: { ...base.completion!, media_ready: false },
      }),
    );
    expect(verdict(cards()[0], he.slotReviewApprove)).toHaveProperty("disabled", true);
    expect(screen.getByText(he.reviewVideosNotReady)).toBeTruthy();
  });

  it("keeps the whole-task approve and reopen buttons for a task without sub-tasks", () => {
    renderDialog(subtaskTask({ completion_requirements: [], photo_required: true }));
    expect(screen.queryAllByTestId("slot-review-card")).toHaveLength(0);
    expect(screen.getByRole("button", { name: he.taskApproveClose })).toBeTruthy();
    expect(screen.getByRole("button", { name: he.taskReopen })).toBeTruthy();
  });
});
