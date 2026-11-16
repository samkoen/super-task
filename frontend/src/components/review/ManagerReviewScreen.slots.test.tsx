import { forwardRef, useImperativeHandle } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import ManagerReviewScreen from "./ManagerReviewScreen";
import { he } from "../../i18n/he";
import { taskService } from "../../services/taskService";

vi.mock("../../services/taskService", () => ({
  taskService: { getOccurrence: vi.fn(), approve: vi.fn(), confirmMedia: vi.fn(), reviewSlots: vi.fn(), uploadPhoto: vi.fn() },
}));
vi.mock("../tasks/TaskChatDialog", () => ({
  default: ({ open, onOccurrenceUpdated }: { open: boolean; onOccurrenceUpdated?: (status: string, notice?: string) => void }) =>
    open ? <button onClick={() => onOccurrenceUpdated?.("in_progress", "המשימה חזרה לעובד")}>chat-moved</button> : null,
}));
vi.mock("../chat/ChatPhotoAnnotateReplyDialog", () => ({ default: () => null }));
vi.mock("../tasks/CompletionExampleDialog", () => ({ default: () => null }));
vi.mock("../tasks/review/SlotMedia", () => ({ default: ({ title }: { title: string }) => <div data-testid="slot-media">{title}</div> }));
vi.mock("../media/PhotoAnnotationCanvas", () => ({
  default: forwardRef((_props: unknown, ref) => {
    useImperativeHandle(ref, () => ({
      hasAnnotations: () => false,
      exportFile: async () => new File(["x"], "x.jpg", { type: "image/jpeg" }),
    }));
    return <div data-testid="annotation-canvas" />;
  }),
}));
vi.mock("../../hooks/useResolvedMediaSrc", () => ({
  useResolvedMediaSrc: (path: string | null) => ({ src: path, loading: false, failed: false, onError: () => {} }),
}));

function slotTask(id: string, title: string) {
  return {
    id,
    title,
    status: "pending_review",
    assignee_name: "דני",
    completion_requirements: [{ kind: "photo", title: "מדף" }, { kind: "photo", title: "מקרר" }],
    completion: {
      status: "completed",
      completed_at: "2026-11-16T06:47:00",
      media_ready: true,
      completion_attachments: [{ kind: "photo", url: "/a.jpg" }, { kind: "photo", url: "/b.jpg" }],
    },
  } as never;
}

const queue = [{ id: "t1", title: "מדפים" }, { id: "t2", title: "קופות" }];
const cards = () => screen.getAllByTestId("slot-review-card");
const verdict = (card: HTMLElement, label: string) => within(card).getByRole("button", { name: new RegExp(`^${label}`) });

function renderScreen(onClose = vi.fn(), onDone = vi.fn()) {
  render(<ManagerReviewScreen request={{ startId: "t1", queue }} onClose={onClose} onDone={onDone} />);
  return { onClose, onDone };
}

describe("ManagerReviewScreen — sub-tasks", () => {
  beforeEach(() => {
    vi.mocked(taskService.getOccurrence).mockReset().mockImplementation(async (id: string) => slotTask(id, id === "t1" ? "מדפים" : "קופות"));
    vi.mocked(taskService.reviewSlots).mockReset();
    vi.mocked(taskService.confirmMedia).mockReset().mockResolvedValue({ media_ready: true } as never);
  });

  it("waits for a V or an X on every sub-task, then closes the task with the stars", async () => {
    vi.mocked(taskService.reviewSlots).mockResolvedValue({ outcome: "approved" } as never);
    const { onDone } = renderScreen();
    await screen.findByText("מדפים");
    expect(screen.queryByTestId("review-return")).toBeNull();
    expect((screen.getByTestId("review-approve") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(verdict(cards()[0], he.slotReviewApprove));
    fireEvent.click(verdict(cards()[1], he.slotReviewApprove));
    expect((screen.getByTestId("review-approve") as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByTestId("review-approve"));
    await waitFor(() => expect(taskService.reviewSlots).toHaveBeenCalledWith("t1", expect.objectContaining({ quality_rating: 4 })));
    expect(onDone).toHaveBeenCalledWith(he.taskApprovedSuccess);
    expect(await screen.findByText("קופות")).toBeTruthy();
  });

  it("sends the task back when a sub-task gets an X with a remark", async () => {
    vi.mocked(taskService.reviewSlots).mockResolvedValue({ outcome: "rejected" } as never);
    const { onDone } = renderScreen();
    await screen.findByText("מדפים");
    fireEvent.click(verdict(cards()[0], he.slotReviewApprove));
    fireEvent.click(verdict(cards()[1], he.slotReviewReject));
    fireEvent.change(screen.getByLabelText(he.slotRemarkLabel), { target: { value: "חסר המדף העליון" } });
    fireEvent.click(screen.getByRole("button", { name: he.slotRemarkSave }));
    await waitFor(() => expect(screen.getByTestId("review-approve").textContent).toBe(he.slotReviewFinishReopen));
    fireEvent.click(screen.getByTestId("review-approve"));
    await waitFor(() => expect(taskService.reviewSlots).toHaveBeenCalledWith("t1", {
      decisions: [{ index: 0, status: "approved" }, { index: 1, status: "rejected", remark: "חסר המדף העליון" }],
    }));
    expect(onDone).toHaveBeenCalledWith(he.taskReopenedSuccess);
  });

  it("moves on when the chat sends the task back to the oved", async () => {
    const { onDone } = renderScreen();
    await screen.findByText("מדפים");
    fireEvent.click(screen.getByRole("button", { name: he.managerReviewOpenChat }));
    fireEvent.click(screen.getByText("chat-moved"));
    expect(onDone).toHaveBeenCalledWith("המשימה חזרה לעובד");
    expect(await screen.findByText("קופות")).toBeTruthy();
  });
});
