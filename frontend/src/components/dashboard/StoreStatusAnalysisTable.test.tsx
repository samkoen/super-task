import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import StoreStatusAnalysisTable from "./StoreStatusAnalysisTable";
import { he } from "../../i18n/he";
import type { TeamMember } from "../../services/dashboardService";

const team: TeamMember[] = [
  {
    user_id: "u1",
    full_name: "ראובן",
    job_function: "מחסן",
    is_active: true,
    status: "active",
    current_task_title: null,
    current_department_name: null,
    completed_today: 0,
    total_today: 2,
    open_tasks: 2,
    timeline: [
      {
        id: "t1",
        title: "פריקה",
        status: "pending",
        segment: "upcoming",
        due_at: "2026-07-14T10:00:00+03:00",
        started_at: null,
        completed_at: null,
        duration_minutes: null,
        elapsed_minutes: null,
        department_name: "מחסן",
        assignee_name: "ראובן",
        task_kind: "fixed",
      },
      {
        id: "t2",
        title: "סידור",
        status: "pending",
        segment: "upcoming",
        due_at: "2026-07-14T11:00:00+03:00",
        started_at: null,
        completed_at: null,
        duration_minutes: null,
        elapsed_minutes: null,
        department_name: "מחסן",
        assignee_name: "ראובן",
        task_kind: "fixed",
      },
    ],
    overdue_backlog: [],
  },
];

describe("StoreStatusAnalysisTable", () => {
  it("renders employee row counts", () => {
    render(<StoreStatusAnalysisTable team={team} />);
    expect(screen.getByText(he.dashboardStatusAnalysisTitle)).toBeTruthy();
    expect(screen.getByText("ראובן")).toBeTruthy();
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
  });

  it("expands detail on double click of count cell", () => {
    render(<StoreStatusAnalysisTable team={team} onOpenTask={vi.fn()} />);
    const cell = screen.getAllByText("2")[0];
    fireEvent.doubleClick(cell);
    expect(screen.getByText(/פירוט: ראובן/)).toBeTruthy();
    expect(screen.getByText("פריקה")).toBeTruthy();
  });

  it("shows empty state", () => {
    render(<StoreStatusAnalysisTable team={[]} />);
    expect(screen.getByText(he.dashboardStaffOverviewEmpty)).toBeTruthy();
  });
});
