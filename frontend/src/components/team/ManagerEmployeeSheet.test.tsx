import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import type { User } from "../../services/api";
import type { TeamMember } from "../../services/dashboardService";
import { directChatService } from "../../services/directChatService";
import { taskService, type TaskOccurrence } from "../../services/taskService";
import { rosterEntry } from "../../utils/managerTeam";
import ManagerEmployeeSheet from "./ManagerEmployeeSheet";

const auth = { user: { id: "m1", role: "network_manager" } };
const feedback = { showSuccess: vi.fn(), showError: vi.fn() };
vi.mock("../../context/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("../../context/FeedbackContext", () => ({ useFeedback: () => feedback }));
vi.mock("../../hooks/useTaskChangeListener", () => ({ useTaskChangeListener: () => undefined }));
vi.mock("../../services/taskService", () => ({ taskService: { listOccurrences: vi.fn(), cancel: vi.fn(), setManagerNext: vi.fn() } }));
vi.mock("../../services/directChatService", () => ({ directChatService: { openWith: vi.fn() } }));
vi.mock("../chat/DirectChatThread", () => ({ default: ({ conversationId }: { conversationId: string }) => <div data-testid="chat-thread">{conversationId}</div> }));
vi.mock("../review/ManagerReviewScreen", () => ({
  default: ({ request }: { request: { startId: string } | null }) => (request ? <div data-testid="review-screen">{request.startId}</div> : null),
}));
vi.mock("../review/ManagerTaskSummaryScreen", () => ({ default: ({ taskId }: { taskId: string | null }) => (taskId ? <div data-testid="summary-dialog">{taskId}</div> : null) }));
vi.mock("../tasks/today/ManagerTaskEditScreen", () => ({ default: ({ occurrenceId }: { occurrenceId: string | null }) => (occurrenceId ? <div data-testid="edit-dialog">{occurrenceId}</div> : null) }));

const at = (hour: number) => new Date(2026, 10, 16, hour).toISOString();
const occ = (id: string, hour: number, status: TaskOccurrence["status"], assignee = "u1") =>
  ({ id, title: id, due_at: at(hour), status, assignee_user_id: assignee, assignee_name: "שמואל", branch_id: "b1" }) as TaskOccurrence;

const member = {
  user_id: "u1", full_name: "שמואל שמואל", status: "in_progress", current_task_title: "ספירה", completed_today: 1, total_today: 3,
  timeline: [], overdue_backlog: [], quality_rating: { average: 4.5, count: 2, by_category: [] },
} as unknown as TeamMember;
const user = { id: "u1", full_name: "שמואל שמואל", branch_id: "b1", is_active: true, role: "employee" } as User;

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{`${loc.pathname}${loc.search}|${(loc.state as { returnTo?: string } | null)?.returnTo ?? ""}`}</div>;
}

function renderSheet(onAccount?: () => void) {
  render(
    <MemoryRouter initialEntries={["/manager/employees?branch=b1&employee=u1"]}>
      <Routes>
        <Route path="/manager/employees" element={<ManagerEmployeeSheet entry={rosterEntry(user, member, "b1")} onClose={vi.fn()} onAccount={onAccount} />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ManagerEmployeeSheet", () => {
  beforeEach(() => {
    vi.mocked(taskService.listOccurrences).mockReset().mockResolvedValue([occ("p1", 9, "pending_review"), occ("done", 10, "completed"), occ("todo", 18, "pending"), occ("other", 9, "pending", "u2")]);
    vi.mocked(directChatService.openWith).mockReset().mockResolvedValue({ conversation: { id: "c1" } } as never);
  });

  it("shows what he is doing, his day and his quality ratings", async () => {
    renderSheet();
    expect(screen.getByTestId("employee-sheet-hero").textContent).toContain("ספירה");
    await screen.findByTestId("tasks-row-p1");
    expect(screen.queryByTestId("tasks-row-other")).toBeNull();
    expect(taskService.listOccurrences).toHaveBeenCalledWith({ branch_id: "b1", due_on: expect.any(String) });
    expect(screen.getByTestId("employee-sheet-quality")).toBeTruthy();
  });

  it("opens the review, the summary or the task sheet like the tasks tab", async () => {
    renderSheet();
    fireEvent.click(await screen.findByTestId("tasks-row-p1"));
    expect(screen.getByTestId("review-screen").textContent).toBe("p1");
    fireEvent.click(screen.getByTestId("tasks-row-done"));
    expect(screen.getByTestId("summary-dialog").textContent).toBe("done");
    fireEvent.click(screen.getByTestId("tasks-row-todo"));
    expect(screen.getByTestId("edit-dialog").textContent).toBe("todo");
  });

  it("opens the direct chat with him", async () => {
    renderSheet();
    fireEvent.click(screen.getByTestId("employee-sheet-chat"));
    expect((await screen.findByTestId("chat-thread")).textContent).toBe("c1");
    expect(directChatService.openWith).toHaveBeenCalledWith("u1");
  });

  it("creates a task for him in the single studio and comes back to his sheet", async () => {
    renderSheet();
    fireEvent.click(screen.getByTestId("employee-sheet-new-task"));
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/manager/tasks/new?assignee=u1&branch=b1|/manager/employees?branch=b1&employee=u1"));
  });

  it("offers the account only when the page can manage it", () => {
    const onAccount = vi.fn();
    renderSheet(onAccount);
    fireEvent.click(screen.getByTestId("employee-sheet-account"));
    expect(onAccount).toHaveBeenCalled();
  });

  it("hides the account from the home screen", () => {
    renderSheet();
    expect(screen.queryByTestId("employee-sheet-account")).toBeNull();
  });
});
