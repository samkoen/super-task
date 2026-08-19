import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import EmployeeTaskSection from "./EmployeeTaskSection";
import { he } from "../../i18n/he";
import type { EmployeeTaskCard } from "../../services/dashboardService";

const task: EmployeeTaskCard = {
  id: "t1",
  title: "פתיחת סניף",
  description: "",
  due_at: "2026-08-19T08:00:00+03:00",
  status: "pending",
  task_kind: "fixed",
  photo_required: false,
  department_name: null,
  started_at: null,
};

describe("EmployeeTaskSection", () => {
  it("hides an empty block", () => {
    const { container } = render(
      <EmployeeTaskSection title={he.employeeRoutineTasks} tasks={[]} onOpen={vi.fn()} />,
    );
    expect(container.textContent).toBe("");
  });

  it("renders the compact list title with count", () => {
    render(
      <EmployeeTaskSection title={he.employeeRoutineTasks} tasks={[task]} onOpen={vi.fn()} />,
    );
    expect(screen.getByText(`${he.employeeRoutineTasks} (1)`)).toBeTruthy();
    expect(screen.getByText("פתיחת סניף")).toBeTruthy();
  });
});
