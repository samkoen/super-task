import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import StaffProgressOverview from "./StaffProgressOverview";
import { he } from "../../i18n/he";
import type { TeamMember } from "../../services/dashboardService";

const member: TeamMember = {
  user_id: "u1",
  full_name: "יוסי כהן",
  job_function: "stockers",
  is_active: true,
  status: "in_progress",
  current_task_title: "ניקוי",
  current_department_name: "ירקות",
  completed_today: 1,
  total_today: 3,
  open_tasks: 2,
  timeline: [
    {
      id: "t1",
      title: "ניקוי מדף",
      status: "in_progress",
      segment: "in_progress",
      due_at: "2026-07-14T11:00:00+03:00",
      started_at: "2026-07-14T08:20:00+03:00",
      completed_at: null,
      duration_minutes: null,
      elapsed_minutes: 40,
      department_name: "ירקות",
      assignee_name: "יוסי כהן",
      task_kind: "fixed",
    },
    {
      id: "t2",
      title: "סידור",
      status: "completed",
      segment: "completed",
      due_at: "2026-07-14T09:00:00+03:00",
      started_at: "2026-07-14T08:20:00+03:00",
      completed_at: "2026-07-14T08:50:00+03:00",
      duration_minutes: 30,
      elapsed_minutes: null,
      department_name: "ירקות",
      assignee_name: "יוסי כהן",
      task_kind: "fixed",
    },
  ],
  overdue_backlog: [],
};

describe("StaffProgressOverview", () => {
  it("shows employee presence and expands task accordion", () => {
    render(<StaffProgressOverview team={[member]} />);
    expect(screen.getByText(he.dashboardStaffOverview)).toBeTruthy();
    expect(screen.getByText(/יוסי כהן/)).toBeTruthy();
    expect(screen.getByText(he.jobFunctionLabels.stockers, { exact: false })).toBeTruthy();

    fireEvent.click(screen.getByText(/יוסי כהן/));
    expect(screen.getByText("ניקוי מדף")).toBeTruthy();
    expect(screen.getByText("סידור")).toBeTruthy();
  });

  it("shows empty hint when no employees", () => {
    render(<StaffProgressOverview team={[]} />);
    expect(screen.getByText(he.dashboardStaffOverviewEmpty)).toBeTruthy();
  });
});
