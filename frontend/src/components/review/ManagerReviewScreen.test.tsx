import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ManagerReviewScreen from "./ManagerReviewScreen";
import { he } from "../../i18n/he";
import { taskService } from "../../services/taskService";
import { reopenReviewedTask } from "../../utils/reviewReopenPhotos";

vi.mock("../../services/taskService", () => ({
  taskService: { getOccurrence: vi.fn(), approve: vi.fn(), confirmMedia: vi.fn(), reviewSlots: vi.fn(), uploadPhoto: vi.fn() },
}));
vi.mock("../../utils/reviewReopenPhotos", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../utils/reviewReopenPhotos")>()),
  reopenReviewedTask: vi.fn(),
}));
vi.mock("../tasks/TaskChatDialog", () => ({ default: () => null }));
vi.mock("../tasks/CompletionMediaPreview", () => ({ default: () => <div>media</div> }));
vi.mock("../chat/ChatPhotoAnnotateReplyDialog", () => ({ default: () => null }));

const queue = [{ id: "t1", title: "מחסן" }, { id: "t2", title: "חזית" }];

function occurrence(id: string, title: string, mediaReady = true) {
  return {
    id,
    title,
    status: "pending_review",
    assignee_name: "דני",
    completion_requirements: [],
    completion: { status: "completed", completed_at: "2026-11-16T06:47:00", completion_attachments: [], media_ready: mediaReady },
  } as never;
}

function renderScreen(onClose = vi.fn(), onDone = vi.fn()) {
  render(<ManagerReviewScreen request={{ startId: "t1", queue }} onClose={onClose} onDone={onDone} />);
  return { onClose, onDone };
}

describe("ManagerReviewScreen", () => {
  beforeEach(() => {
    vi.mocked(taskService.getOccurrence).mockReset().mockImplementation(async (id: string) => occurrence(id, id === "t1" ? "מחסן" : "חזית"));
    vi.mocked(taskService.approve).mockReset().mockResolvedValue({} as never);
    vi.mocked(taskService.confirmMedia).mockReset().mockResolvedValue({ media_ready: false } as never);
    vi.mocked(reopenReviewedTask).mockReset().mockResolvedValue(undefined as never);
  });

  it("shows the oved, the queue position and the next card", async () => {
    renderScreen();
    expect(await screen.findByText("מחסן")).toBeTruthy();
    expect(screen.getByTestId("review-subtitle").textContent).toBe("דני · נשלח 06:47");
    expect(screen.getByTestId("review-queue").textContent).toBe(he.managerReviewQueue(1, 2));
    expect(screen.getByTestId("review-next").textContent).toBe(he.managerReviewNext("חזית"));
  });

  it("approves with four stars and moves to the next proof", async () => {
    const { onDone } = renderScreen();
    fireEvent.click(await screen.findByTestId("review-approve"));
    await waitFor(() => expect(taskService.approve).toHaveBeenCalledWith("t1", { quality_rating: 4 }));
    expect(onDone).toHaveBeenCalledWith(he.taskApprovedSuccess);
    expect(await screen.findByText("חזית")).toBeTruthy();
    expect(screen.getByTestId("review-queue").textContent).toBe(he.managerReviewQueue(2, 2));
    expect(screen.queryByTestId("review-next")).toBeNull();
  });

  it("returns the task to the oved with the remark and goes on to the card still waiting", async () => {
    const onClose = vi.fn();
    render(<ManagerReviewScreen request={{ startId: "t2", queue }} onClose={onClose} onDone={vi.fn()} />);
    fireEvent.click(await screen.findByTestId("review-return"));
    fireEvent.change(screen.getByLabelText(he.taskReopenNote), { target: { value: "חסר מדף עליון" } });
    fireEvent.click(screen.getByTestId("review-return-send"));
    await waitFor(() => expect(reopenReviewedTask).toHaveBeenCalledWith(expect.objectContaining({ occurrenceId: "t2", note: "חסר מדף עליון" })));
    expect(await screen.findByText("מחסן")).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("blocks the decision while the videos are still being prepared", async () => {
    vi.mocked(taskService.getOccurrence).mockImplementation(async (id: string) => occurrence(id, "מחסן", false));
    renderScreen();
    await screen.findByText("מחסן");
    expect((screen.getByTestId("review-approve") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId("review-return") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(he.reviewVideosNotReady)).toBeTruthy();
  });

  it("closes once every card in the queue is decided", async () => {
    const onClose = vi.fn();
    render(<ManagerReviewScreen request={{ startId: "t1", queue: [queue[0]] }} onClose={onClose} onDone={vi.fn()} />);
    fireEvent.click(await screen.findByTestId("review-approve"));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
