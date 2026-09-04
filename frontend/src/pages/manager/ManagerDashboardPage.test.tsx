import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ManagerDashboardPage from "./ManagerDashboardPage";
import { he } from "../../i18n/he";
import { formatHebrewDay, todayIso } from "../../utils/dateView";
import { dashboardService } from "../../services/dashboardService";

vi.mock("../../context/FeedbackContext", () => ({
  useFeedback: () => ({ showError: vi.fn(), showSuccess: vi.fn() }),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "m1",
      role: "branch_manager",
      full_name: "דנה מנהלת",
      branch_name: "שפע",
      network_name: "רשת עלי",
      avatar_url: null,
      excellence_slogan: "מצוינות כל יום",
    },
    refresh: vi.fn(),
  }),
}));

vi.mock("../../services/dashboardService", () => ({
  dashboardService: { getManager: vi.fn() },
}));

vi.mock("../../services/promotionStageService", () => ({
  promotionStageService: { analysis: vi.fn().mockResolvedValue([]) },
}));

vi.mock("../../hooks/useTaskChangeListener", () => ({
  useTaskChangeListener: () => undefined,
}));

vi.mock("../../utils/notificationSounds", () => ({
  bindNotificationAudioUnlock: () => undefined,
  playManagerQuestionSound: vi.fn(),
}));

vi.mock("../../components/dashboard/ManagerTodayBoard", () => ({
  default: () => <div>today-board</div>,
}));

vi.mock("../../components/employee/EmployeeAvatarCapture", () => ({
  default: () => null,
}));

vi.mock("../../components/tasks/TaskCompletionReviewDialog", () => ({
  default: () => null,
}));

vi.mock("../../components/tasks/TaskOccurrenceEditDialog", () => ({
  default: () => null,
}));

vi.mock("../../components/dashboard/DepartmentProgressGrid", () => ({
  default: () => null,
}));

vi.mock("../../components/dashboard/PromotionStagesAnalysisTable", () => ({
  default: () => null,
}));

vi.mock("../../services/branchService", () => ({
  branchService: { list: vi.fn().mockResolvedValue([]) },
}));

vi.mock("../../services/authService", () => ({
  authService: { stylizeAvatar: vi.fn(), deleteAvatar: vi.fn() },
}));

vi.mock("../../services/taskService", () => ({
  taskService: { getOccurrence: vi.fn() },
}));

describe("ManagerDashboardPage", () => {
  beforeEach(() => {
    vi.mocked(dashboardService.getManager).mockResolvedValue({
      due_on: todayIso(),
      branch: { id: "b1", name: "שפע", network_id: "n1" },
      network_name: "רשת עלי",
      health: "green",
      counts: {
        tasks_total: 0,
        tasks_completed: 0,
        tasks_pending: 0,
        tasks_in_progress: 0,
        tasks_overdue: 0,
        tasks_cancelled: 0,
        completion_rate: 1,
      },
      store_kpis: null,
      by_department: null,
      team: [],
      task_queues: { completed: [], in_progress: [], pending_review: [], upcoming: [] },
      unfinished_tasks: null,
      recent_alerts: [],
      branches: [],
      manages_all_workers: false,
    });
  });

  it("shows the same identity header as the oved dashboard", async () => {
    render(
      <MemoryRouter>
        <ManagerDashboardPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "דנה מנהלת" })).toBeTruthy();
    expect(screen.getByText(formatHebrewDay(todayIso()))).toBeTruthy();
    expect(screen.getByText("דמ")).toBeTruthy();
    expect(screen.getByText("מצוינות כל יום")).toBeTruthy();
    expect(screen.getByText(`${he.branch}: שפע · ${he.roleBranchManager}`)).toBeTruthy();
    expect(screen.getByRole("button", { name: he.employeeChangePhoto })).toBeTruthy();
    expect(screen.queryByRole("button", { name: he.employeeBreakStart })).toBeNull();
    await waitFor(() => expect(screen.getByText("today-board")).toBeTruthy());
  });
});
