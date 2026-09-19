import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ManagerOwnTasksSection from "./ManagerOwnTasksSection";
import { emptyManagerMyWork } from "../../utils/managerUnreadChats";
import { he } from "../../i18n/he";
import type { EmployeeTaskCard } from "../../services/dashboardService";

function task(id: string, kind: "fixed" | "ad_hoc" = "fixed"): EmployeeTaskCard {
  return {
    id,
    title: id,
    description: "",
    due_at: "2026-09-19T18:00:00+03:00",
    status: "pending",
    task_kind: kind,
    photo_required: false,
    department_name: null,
    started_at: null,
  };
}

describe("ManagerOwnTasksSection", () => {
  it("shows the empty state when the menahel has no open work", () => {
    render(<ManagerOwnTasksSection work={emptyManagerMyWork()} onOpen={vi.fn()} />);
    expect(screen.getByText(he.dashboardMyTasksTitle)).toBeTruthy();
    expect(screen.getByText(he.dashboardMyTasksEmpty)).toBeTruthy();
  });

  it("lists the menahel's own routine and dynamic tasks", () => {
    render(
      <ManagerOwnTasksSection
        work={{
          ...emptyManagerMyWork(),
          today_tasks: [task("קבועה"), task("מזדמנת", "ad_hoc")],
        }}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.getByText("קבועה")).toBeTruthy();
    expect(screen.getByText("מזדמנת")).toBeTruthy();
  });
});
