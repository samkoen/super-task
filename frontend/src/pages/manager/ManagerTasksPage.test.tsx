import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import type { TaskOccurrence } from "../../services/taskService";
import { taskService } from "../../services/taskService";
import { he } from "../../i18n/he";
import ManagerTasksPage from "./ManagerTasksPage";

const auth = { user: { id: "m1", role: "network_manager", full_name: "יצחק", branch_id: null as string | null } };
const showSuccess = vi.fn();
// Fonctions stables comme dans l'app : sinon le chargement (qui en dépend) se relance sans fin.
const feedback = { showSuccess, showError: vi.fn() };
vi.mock("../../context/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("../../context/FeedbackContext", () => ({ useFeedback: () => feedback }));
vi.mock("../../hooks/useTaskChangeListener", () => ({ useTaskChangeListener: () => undefined }));
vi.mock("../../services/taskService", () => ({
  taskService: { listOccurrences: vi.fn(), setManagerNext: vi.fn(), cancel: vi.fn() },
}));
vi.mock("../../services/branchService", () => ({ branchService: { list: vi.fn().mockResolvedValue([{ id: "b1", name: "TEST" }]) } }));
vi.mock("../../services/userService", () => ({
  userService: { listTeam: vi.fn().mockResolvedValue([{ id: "u1", full_name: "שמואל", role: "employee", branch_id: "b1" }]) },
}));
vi.mock("../../components/review/ManagerReviewScreen", () => ({
  default: ({ request }: { request: { startId: string; queue: { id: string }[] } | null }) =>
    request ? <div data-testid="review-screen">{`${request.startId}:${request.queue.map((q) => q.id).join(",")}`}</div> : null,
}));
vi.mock("../../components/tasks/TaskCompletionReviewDialog", () => ({
  default: ({ task }: { task: TaskOccurrence | null }) => (task ? <div data-testid="summary-dialog">{task.id}</div> : null),
}));
vi.mock("../../components/tasks/TaskOccurrenceEditDialog", () => ({
  default: ({ occurrenceId, footer }: { occurrenceId: string | null; footer?: (t: TaskOccurrence) => ReactNode }) =>
    occurrenceId ? <div data-testid="edit-dialog">{footer?.({ id: occurrenceId } as TaskOccurrence)}</div> : null,
}));

const at = (hour: number) => new Date(2026, 10, 16, hour).toISOString();
function occ(id: string, hour: number, status: TaskOccurrence["status"], patch: Partial<TaskOccurrence> = {}): TaskOccurrence {
  return { id, title: id, due_at: at(hour), status, assignee_name: "שמואל", assignee_user_id: "u1", branch_id: "b1", ...patch } as TaskOccurrence;
}

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname + loc.search}</div>;
}

function renderPage(path = "/manager/tasks?branch=b1", state?: unknown) {
  render(
    <MemoryRouter initialEntries={[{ pathname: path.split("?")[0], search: path.includes("?") ? `?${path.split("?")[1]}` : "", state }]}>
      <Routes>
        <Route path="/manager/tasks" element={<ManagerTasksPage />} />
        <Route path="/admin/tasks" element={<ManagerTasksPage />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ManagerTasksPage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    auth.user = { id: "m1", role: "network_manager", full_name: "יצחק", branch_id: null };
    showSuccess.mockReset();
    vi.mocked(taskService.listOccurrences).mockReset().mockResolvedValue([
      occ("late", 6, "overdue"), occ("p1", 9, "pending_review"), occ("p2", 13, "pending_review"),
      occ("done", 10, "completed"), occ("todo", 19, "pending"),
    ]);
    vi.mocked(taskService.setManagerNext).mockReset().mockResolvedValue({ message: "" } as never);
    vi.mocked(taskService.cancel).mockReset().mockResolvedValue({ deleted_count: 1 } as never);
  });

  it("loads the snif of the address from the very first request", async () => {
    renderPage();
    await screen.findByTestId("tasks-row-p1");
    expect(vi.mocked(taskService.listOccurrences).mock.calls[0][0]).toMatchObject({ branch_id: "b1" });
  });

  it("opens the full-screen review on the day's proofs", async () => {
    renderPage();
    fireEvent.click(await screen.findByTestId("tasks-row-p2"));
    expect(screen.getByTestId("review-screen").textContent).toBe("p2:p1,p2");
  });

  it("opens the summary of a closed task and the edit sheet of an open one", async () => {
    renderPage();
    fireEvent.click(await screen.findByTestId("tasks-row-done"));
    expect(screen.getByTestId("summary-dialog").textContent).toBe("done");
    fireEvent.click(screen.getByTestId("tasks-row-todo"));
    expect(screen.getByTestId("edit-dialog")).toBeTruthy();
  });

  it("shows the next-task mark from the reloaded list", async () => {
    renderPage();
    fireEvent.click(await screen.findByTestId("tasks-row-todo"));
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(false);
    vi.mocked(taskService.listOccurrences).mockResolvedValue([occ("todo", 19, "pending", { is_manager_next: true })]);
    fireEvent.click(screen.getByRole("checkbox"));
    await waitFor(() => expect(taskService.setManagerNext).toHaveBeenCalledWith("todo", true));
    await waitFor(() => expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(true));
  });

  it("asks before deleting from the task sheet", async () => {
    renderPage();
    fireEvent.click(await screen.findByTestId("tasks-row-todo"));
    fireEvent.click(screen.getByTestId("task-edit-delete"));
    expect(taskService.cancel).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: he.taskDeleteConfirm }));
    await waitFor(() => expect(taskService.cancel).toHaveBeenCalledWith("todo", false));
  });

  it("sends old « new task » links to the single studio", async () => {
    renderPage("/manager/tasks", { openNewTask: true });
    expect((await screen.findByTestId("where")).textContent).toBe("/manager/tasks/new");
  });

  it("sends an issue turned into a task to the studio", async () => {
    renderPage("/manager/tasks", { adHocPrefillFromIssue: { title: "נזילה" } });
    expect((await screen.findByTestId("where")).textContent).toBe("/manager/tasks/new");
  });

  it("gives admin a « new task » button", async () => {
    auth.user = { id: "a1", role: "admin", full_name: "אדמין", branch_id: null };
    renderPage("/admin/tasks");
    fireEvent.click(await screen.findByTestId("tasks-new"));
    expect(screen.getByTestId("where").textContent).toBe("/admin/tasks/new");
  });
});
