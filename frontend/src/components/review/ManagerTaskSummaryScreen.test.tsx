import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ManagerTaskSummaryScreen from "./ManagerTaskSummaryScreen";
import { he } from "../../i18n/he";
import { taskService } from "../../services/taskService";

vi.mock("../../services/taskService", () => ({
  taskService: { getOccurrence: vi.fn(), reopenClosed: vi.fn() },
}));
vi.mock("../tasks/TaskChatDialog", () => ({ default: () => null }));
vi.mock("../tasks/CompletionMediaPreview", () => ({ default: () => <div data-testid="media">media</div> }));

function closedTask(reviewStatus: string | null, rating: number | null = 4) {
  return {
    id: "t1",
    title: "פתיחת משמרת",
    status: "completed",
    assignee_name: "שמואל",
    completion_requirements: [],
    completion: {
      status: "completed",
      completed_at: "2026-11-18T00:26:00",
      completion_attachments: [],
      media_ready: true,
      manager_review_status: reviewStatus,
      quality_rating: rating,
    },
  } as never;
}

function renderScreen(onClose = vi.fn(), onDone = vi.fn()) {
  render(<ManagerTaskSummaryScreen taskId="t1" onClose={onClose} onDone={onDone} />);
  return { onClose, onDone };
}

describe("ManagerTaskSummaryScreen", () => {
  beforeEach(() => {
    vi.mocked(taskService.getOccurrence).mockReset().mockResolvedValue(closedTask("approved"));
    vi.mocked(taskService.reopenClosed).mockReset().mockResolvedValue({} as never);
  });

  it("shows an accepted task in the review style: oved, state, proof and stars", async () => {
    renderScreen();
    expect(await screen.findByText("פתיחת משמרת")).toBeTruthy();
    expect(screen.getByTestId("review-subtitle").textContent).toBe("שמואל · נשלח 00:26");
    expect(screen.getByTestId("review-queue").textContent).toBe(he.taskClosedDetailTitle);
    expect(screen.getByTestId("summary-media")).toBeTruthy();
    expect(screen.getByTestId("summary-rating")).toBeTruthy();
  });

  it("reopens an accepted task with the menahel's remark", async () => {
    const { onClose, onDone } = renderScreen();
    fireEvent.click(await screen.findByTestId("summary-reopen"));
    fireEvent.change(screen.getByLabelText(he.taskReopenNote), { target: { value: "חסר המקרר" } });
    fireEvent.click(screen.getByTestId("review-return-send"));
    await waitFor(() => expect(taskService.reopenClosed).toHaveBeenCalledWith("t1", { rejection_note: "חסר המקרר" }));
    expect(onDone).toHaveBeenCalledWith(he.taskReopenedSuccess);
    expect(onClose).toHaveBeenCalled();
  });

  it("falls back to the default remark when the menahel writes nothing", async () => {
    renderScreen();
    fireEvent.click(await screen.findByTestId("summary-reopen"));
    fireEvent.click(screen.getByTestId("review-return-send"));
    await waitFor(() => expect(taskService.reopenClosed).toHaveBeenCalledWith("t1", { rejection_note: he.taskReopenNoteFallback }));
  });

  it("does not offer to reopen a task closed without an ichour", async () => {
    vi.mocked(taskService.getOccurrence).mockResolvedValue(closedTask(null, null));
    renderScreen();
    expect(await screen.findByText("פתיחת משמרת")).toBeTruthy();
    expect(screen.getByTestId("review-queue").textContent).toBe(he.taskClosedSummaryTitle);
    expect(screen.queryByTestId("summary-reopen")).toBeNull();
    expect(screen.queryByTestId("summary-rating")).toBeNull();
  });
});
