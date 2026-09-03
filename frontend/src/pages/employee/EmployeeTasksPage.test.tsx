import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EmployeeTasksPage from "./EmployeeTasksPage";
import { he } from "../../i18n/he";
import { dashboardService, type EmployeeDashboard, type EmployeeTaskCard } from "../../services/dashboardService";

vi.mock("../../context/FeedbackContext", () => ({
  useFeedback: () => ({ showError: vi.fn(), showSuccess: vi.fn() }),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "e1", role: "employee", preferred_language: "he", full_name: "דני עובד" },
    refresh: vi.fn(),
  }),
}));

vi.mock("../../services/dashboardService", () => ({
  dashboardService: { getEmployee: vi.fn() },
}));

vi.mock("../../services/employeeActivityService", () => ({
  employeeActivityService: { getBreak: vi.fn().mockResolvedValue({ on_break: false }) },
}));

vi.mock("../../services/directChatService", () => ({
  directChatService: { inbox: vi.fn().mockResolvedValue({ items: [], up: null, unread_count: 0, managers: [] }) },
}));

vi.mock("../../hooks/useTaskChangeListener", () => ({
  useTaskChangeListener: () => undefined,
}));

vi.mock("../../hooks/useDirectChatLiveSync", () => ({
  useDirectChatLiveSync: () => undefined,
}));

vi.mock("../../components/tasks/EmployeeTaskDetailDialog", () => ({
  default: ({
    task,
    onChatUpdated,
  }: {
    task: { title?: string } | null;
    onChatUpdated?: () => void;
  }) =>
    task ? (
      <div>
        <div>detail:{task.title}</div>
        <button type="button" onClick={() => onChatUpdated?.()}>send-chat</button>
      </div>
    ) : null,
}));

function card(over: Partial<EmployeeTaskCard> & Pick<EmployeeTaskCard, "id" | "title">): EmployeeTaskCard {
  return {
    description: "",
    due_at: over.due_at ?? "2099-09-02T20:00:00+03:00",
    status: over.status ?? "pending",
    task_kind: over.task_kind ?? "fixed",
    photo_required: false,
    department_name: null,
    started_at: null,
    ...over,
  };
}

function dashboard(over: Partial<EmployeeDashboard> = {}): EmployeeDashboard {
  return {
    due_on: "2026-09-02",
    employee: {
      id: "e1",
      full_name: "דני עובד",
      job_function: null,
      branch_id: "b1",
      branch_name: "שפע",
    },
    progress_percent: 0,
    on_shift: false,
    counts: {
      tasks_total: 1,
      tasks_completed: 0,
      tasks_pending: 1,
      tasks_in_progress: 0,
      tasks_overdue: 0,
      tasks_cancelled: 0,
      completion_rate: 0,
    },
    urgent_tasks: [],
    in_progress_tasks: [],
    awaiting_response_tasks: [],
    pending_review_tasks: [],
    today_tasks: [],
    completed_tasks: [],
    ...over,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <EmployeeTasksPage />
    </MemoryRouter>,
  );
}

describe("EmployeeTasksPage punch doors", () => {
  beforeEach(() => {
    vi.mocked(dashboardService.getEmployee).mockReset();
  });

  it("shows only the start door while clock-in is open", async () => {
    vi.mocked(dashboardService.getEmployee).mockResolvedValue(
      dashboard({
        today_tasks: [
          card({ id: "s", title: "פתיחת משמרת", is_work_start: true }),
          card({ id: "t", title: "מדף חלב" }),
        ],
      }),
    );
    renderPage();
    expect(await screen.findByText(he.punchClockIn)).toBeTruthy();
    expect(screen.queryByText("מדף חלב")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: he.punchClockIn }));
    expect(screen.getByText("detail:פתיחת משמרת")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "send-chat" }));
    await waitFor(() => expect(screen.getByText("detail:פתיחת משמרת")).toBeTruthy());
  });

  it("keeps the list and lets the oved open the end door early", async () => {
    vi.mocked(dashboardService.getEmployee).mockResolvedValue(
      dashboard({
        on_shift: true,
        today_tasks: [
          card({ id: "t", title: "מדף חלב" }),
          card({ id: "e", title: "סיום משמרת", is_work_end: true, due_at: "2099-09-02T20:00:00+03:00" }),
        ],
      }),
    );
    renderPage();
    expect(await screen.findByText("מדף חלב")).toBeTruthy();
    expect(screen.queryByText(he.punchClockOut)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: he.punchOpenEndEarly }));
    expect(screen.getByText(he.punchClockOut)).toBeTruthy();
    expect(screen.queryByText("מדף חלב")).toBeNull();
  });

  it("opens the end door when due_at has already passed", async () => {
    vi.mocked(dashboardService.getEmployee).mockResolvedValue(
      dashboard({
        on_shift: true,
        today_tasks: [
          card({ id: "e", title: "סיום משמרת", is_work_end: true, due_at: "2020-01-01T17:00:00+03:00" }),
          card({ id: "t", title: "מדף חלב" }),
        ],
      }),
    );
    renderPage();
    expect(await screen.findByText(he.punchClockOut)).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("מדף חלב")).toBeNull());
  });
});
