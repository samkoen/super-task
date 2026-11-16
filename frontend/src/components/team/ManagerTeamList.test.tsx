import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { User } from "../../services/api";
import type { TeamMember } from "../../services/dashboardService";
import { he } from "../../i18n/he";
import { buildTeamRoster } from "../../utils/managerTeam";
import ManagerTeamList from "./ManagerTeamList";

const user = (id: string, patch: Partial<User> = {}) => ({ id, full_name: id, branch_id: "b1", branch_name: "TEST", is_active: true, role: "employee", ...patch }) as User;
const member = (id: string, patch: Partial<TeamMember> = {}) =>
  ({ user_id: id, full_name: id, status: "active", completed_today: 0, total_today: 0, timeline: [], overdue_backlog: [], ...patch }) as TeamMember;

describe("ManagerTeamList", () => {
  const roster = buildTeamRoster(
    [user("עובד א"), user("עובד ב"), user("עובד ג", { is_active: false })],
    [
      member("עובד א", { status: "in_progress", current_task_title: "ספירה", completed_today: 1, total_today: 4, overdue_backlog: [{ id: "x", status: "overdue", segment: "overdue" } as never] }),
      member("עובד ב", { completed_today: 2, total_today: 2 }),
    ],
  );

  it("groups the team by state with the task in progress, progress and lateness", () => {
    render(<ManagerTeamList entries={roster} showBranch={false} emptyText="ריק" onOpen={vi.fn()} />);
    expect(screen.getByTestId("team-section-working").textContent).toContain(`${he.managerTeamSections.working} · 1`);
    const row = screen.getByTestId("team-row-עובד א");
    expect(row.textContent).toContain("ספירה");
    expect(row.textContent).toContain(he.managerHomeOverdue(1));
    expect(row.textContent).toContain("1/4");
    expect(screen.getByTestId("team-section-done")).toBeTruthy();
    expect(screen.getByTestId("team-section-noAccess").textContent).toContain(he.managerTeamNoAccess);
  });

  it("adds the snif in network view and opens a person", () => {
    const onOpen = vi.fn();
    render(<ManagerTeamList entries={roster} showBranch emptyText="ריק" onOpen={onOpen} />);
    fireEvent.click(screen.getByTestId("team-row-עובד ב"));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: "עובד ב" }));
    expect(screen.getByTestId("team-row-עובד ב").textContent).toContain("TEST");
  });

  it("says when there is nobody", () => {
    render(<ManagerTeamList entries={[]} showBranch={false} emptyText="אין עובדים" onOpen={vi.fn()} />);
    expect(screen.getByTestId("team-empty").textContent).toBe("אין עובדים");
  });
});
