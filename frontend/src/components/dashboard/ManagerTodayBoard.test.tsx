import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ManagerTodayBoard from "./ManagerTodayBoard";
import { he } from "../../i18n/he";
import type { ManagerDashboard } from "../../services/dashboardService";

vi.mock("./ManagerActionsSection", () => ({
  default: () => <div>actions-section</div>,
}));
vi.mock("./ManagerOwnTasksSection", () => ({
  default: () => <div>own-tasks-section</div>,
}));
vi.mock("./ManagerTeamSection", () => ({
  default: ({ title }: { title?: string }) => <div>{title ?? "team-section"}</div>,
}));

function dash(partial: Partial<ManagerDashboard> = {}): ManagerDashboard {
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
    ...partial,
  };
}

const boardProps = {
  showAnalysis: false,
  chats: [],
  onToggleAnalysis: vi.fn(),
  onReviewTask: vi.fn(),
  onOpenTask: vi.fn(),
  onOpenOwnTask: vi.fn(),
  onOpenChat: vi.fn(),
  onOpenTaskChat: vi.fn(),
  onChanged: vi.fn(),
  onNewTask: vi.fn(),
  onGalleryTask: vi.fn(),
  onViewTasks: vi.fn(),
};

describe("ManagerTodayBoard", () => {
  it("shows actions and own tasks before the team section", () => {
    render(
      <ManagerTodayBoard
        data={dash()}
        title={he.dashboardAllWorkers}
        hint={he.dashboardAllWorkersHint}
        {...boardProps}
      />,
    );
    expect(screen.getByText("actions-section")).toBeTruthy();
    expect(screen.getByText("own-tasks-section")).toBeTruthy();
    expect(screen.getByText(he.dashboardAllWorkers)).toBeTruthy();
  });

  it("shows the summary strip and wires the quick actions", () => {
    const onNewTask = vi.fn();
    render(
      <ManagerTodayBoard
        data={dash({ branch: { id: "b1", name: "סניף" } as ManagerDashboard["branch"] })}
        {...boardProps}
        onNewTask={onNewTask}
      />,
    );
    expect(screen.getByRole("region", { name: he.managerSummaryLabel })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: he.newTask }));
    expect(onNewTask).toHaveBeenCalledTimes(1);
  });

  it("hides quick actions on a network overview without a team", () => {
    render(<ManagerTodayBoard data={dash({ manages_all_workers: false })} {...boardProps} />);
    expect(screen.getByRole("region", { name: he.managerSummaryLabel })).toBeTruthy();
    expect(screen.queryByRole("button", { name: he.newTask })).toBeNull();
  });

  it("hides the team section on a network overview without all-workers", () => {
    render(<ManagerTodayBoard data={dash({ manages_all_workers: false })} {...boardProps} />);
    expect(screen.getByText("actions-section")).toBeTruthy();
    expect(screen.queryByText("team-section")).toBeNull();
    expect(screen.queryByText(he.dashboardAllWorkers)).toBeNull();
  });
});
