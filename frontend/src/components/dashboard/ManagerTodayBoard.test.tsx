import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ManagerTodayBoard from "./ManagerTodayBoard";
import { he } from "../../i18n/he";
import type { ManagerDashboard } from "../../services/dashboardService";

vi.mock("./StoreStatusKpiRow", () => ({ default: () => <div>kpi</div> }));
vi.mock("./ActionRequiredCarousel", () => ({ default: () => null }));
vi.mock("./PendingTasksCarousel", () => ({ default: () => null }));
vi.mock("./StaffProgressOverview", () => ({ default: () => <div>staff</div> }));
vi.mock("./StoreStatusAnalysisTable", () => ({ default: () => null }));

function dash(): ManagerDashboard {
  return {
    due_on: "2026-09-03",
    branch: null,
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
    manages_all_workers: true,
  };
}

describe("ManagerTodayBoard", () => {
  it("shows the all-workers title and hint", () => {
    render(
      <ManagerTodayBoard
        data={dash()}
        title={he.dashboardAllWorkers}
        hint={he.dashboardAllWorkersHint}
        showAnalysis={false}
        onToggleAnalysis={vi.fn()}
        onReviewTask={vi.fn()}
        onOpenTask={vi.fn()}
        onChanged={vi.fn()}
        onNewTask={vi.fn()}
        onGalleryTask={vi.fn()}
        onViewTasks={vi.fn()}
      />,
    );
    expect(screen.getByText(he.dashboardAllWorkers)).toBeTruthy();
    expect(screen.getByText(he.dashboardAllWorkersHint)).toBeTruthy();
    expect(screen.getByText(he.newTask)).toBeTruthy();
  });
});
