import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ManagerDashboardPage from "./ManagerDashboardPage";
import { he } from "../../i18n/he";
import { todayIso } from "../../utils/dateView";
import { dashboardService, type ManagerDashboard } from "../../services/dashboardService";
import { taskService } from "../../services/taskService";

const authUser = { id: "m1", role: "branch_manager", full_name: "דנה מנהלת", branch_name: "שפע", branch_id: "b1" };

vi.mock("../../context/FeedbackContext", () => ({ useFeedback: () => ({ showError: vi.fn(), showSuccess: vi.fn() }) }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: authUser, refresh: vi.fn() }) }));
vi.mock("../../services/dashboardService", () => ({ dashboardService: { getManager: vi.fn() } }));
vi.mock("../../services/promotionStageService", () => ({ promotionStageService: { analysis: vi.fn().mockResolvedValue([]) } }));
vi.mock("../../hooks/useTaskChangeListener", () => ({ useTaskChangeListener: () => undefined }));
vi.mock("../../utils/notificationSounds", () => ({ playManagerQuestionSound: vi.fn() }));
vi.mock("../../services/branchService", () => ({ branchService: { list: vi.fn().mockResolvedValue([]) } }));
vi.mock("../../services/taskService", () => ({ taskService: { getOccurrence: vi.fn() } }));
vi.mock("../../services/directChatService", () => ({
  directChatService: { inbox: vi.fn().mockResolvedValue({ items: [], up: null, unread_count: 0 }) },
}));
vi.mock("../../components/dashboard/home/ManagerHomeDialogs", () => ({ default: () => null }));
vi.mock("../../components/review/ManagerReviewScreen", () => ({
  default: ({ request }: { request: { startId: string; queue: unknown[] } | null }) =>
    request ? <div data-testid="review-screen">{`${request.startId}:${request.queue.length}`}</div> : null,
}));
vi.mock("../../components/dashboard/StoreStatusAnalysisTable", () => ({ default: () => <div>analysis-table</div> }));
vi.mock("../../components/dashboard/StoreStatusKpiRow", () => ({ default: () => null }));
vi.mock("../../components/dashboard/PromotionStagesAnalysisTable", () => ({ default: () => null }));

const at = (hour: number) => new Date(2026, 10, 16, hour).toISOString();

function dashboard(patch: Partial<ManagerDashboard> = {}): ManagerDashboard {
  return {
    due_on: todayIso(),
    branch: { id: "b1", name: "שפע", network_id: "n1" },
    health: "green",
    counts: { tasks_total: 2, tasks_completed: 1, tasks_pending: 1, tasks_in_progress: 0, tasks_overdue: 0, tasks_cancelled: 0, completion_rate: 0.5 },
    store_kpis: null,
    by_department: null,
    team: [],
    task_queues: { completed: [], in_progress: [], upcoming: [], pending_review: [
      { id: "t2", title: "סרטון גיבוי", status: "pending_review", segment: "pending_review", due_at: at(9), completed_at: at(9), assignee_name: "רונית" } as never,
    ] },
    unfinished_tasks: null,
    recent_alerts: [],
    branches: [],
    manages_all_workers: false,
    ...patch,
  };
}

function renderPage() {
  return render(<MemoryRouter><ManagerDashboardPage /></MemoryRouter>);
}

describe("ManagerDashboardPage", () => {
  beforeEach(() => {
    vi.mocked(dashboardService.getManager).mockReset();
    vi.mocked(taskService.getOccurrence).mockReset();
  });

  it("shows the branch pulse, the inbox and the team, for today only", async () => {
    vi.mocked(dashboardService.getManager).mockResolvedValue(dashboard());
    renderPage();
    expect(await screen.findByText(he.managerHomeDone(50))).toBeTruthy();
    expect(screen.getByText(he.managerHomeInboxTitle(1))).toBeTruthy();
    expect(screen.getByText(he.managerHomeTeamTitle)).toBeTruthy();
    expect(dashboardService.getManager).toHaveBeenCalledWith(undefined, todayIso());
    expect(screen.queryByTestId("manager-scope")).toBeNull();
  });

  it("opens the full-screen review on the queue of proofs from the inbox card", async () => {
    vi.mocked(dashboardService.getManager).mockResolvedValue(dashboard());
    renderPage();
    fireEvent.click(await screen.findByText(he.managerHomeInboxActions.review));
    expect((await screen.findByTestId("review-screen")).textContent).toBe("t2:1");
  });

  it("shows the analysis only after tapping the pulse card", async () => {
    vi.mocked(dashboardService.getManager).mockResolvedValue(dashboard());
    renderPage();
    fireEvent.click(await screen.findByTestId("manager-pulse"));
    expect(screen.getByText("analysis-table")).toBeTruthy();
  });

  it("shows the network overview with the inbox to a manager of all workers, not a merged team", async () => {
    vi.mocked(dashboardService.getManager).mockResolvedValue(dashboard({
      branch: null,
      manages_all_workers: true,
      branches: [{ branch_id: "b9", name: "חיפה", health: "green", overdue: 0, pending: 0, completion_rate: 1 }],
    }));
    renderPage();
    expect(await screen.findByTestId("manager-network-home")).toBeTruthy();
    expect(screen.getByText(he.managerHomeInboxTitle(1))).toBeTruthy();
    expect(screen.queryByTestId("manager-team-now")).toBeNull();
    expect(screen.queryByTestId("manager-pulse")).toBeNull();
  });

  it("shows the network overview when no branch is in scope", async () => {
    vi.mocked(dashboardService.getManager).mockResolvedValue(dashboard({
      branch: null,
      task_queues: null,
      branches: [{ branch_id: "b9", name: "חיפה", health: "red", overdue: 4, pending: 1, completion_rate: 0.2 }],
    }));
    renderPage();
    expect(await screen.findByTestId("manager-network-home")).toBeTruthy();
    expect(screen.getByText(he.managerHomeNetworkStatus(0, 1))).toBeTruthy();
  });
});
