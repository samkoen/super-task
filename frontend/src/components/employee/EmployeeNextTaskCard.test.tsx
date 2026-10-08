import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import EmployeeNextTaskCard from "./EmployeeNextTaskCard";
import { he } from "../../i18n/he";
import type { EmployeeTaskCard } from "../../services/dashboardService";

function card(over: Partial<EmployeeTaskCard> = {}): EmployeeTaskCard {
  return {
    id: "t1",
    title: "מילוי מדף חלב",
    description: "",
    due_at: "2099-09-02T10:30:00+03:00",
    status: "pending",
    task_kind: "fixed",
    photo_required: false,
    department_name: null,
    started_at: null,
    ...over,
  };
}

describe("EmployeeNextTaskCard", () => {
  it("shows the label, the title and one big start button", () => {
    const onOpen = vi.fn();
    const task = card();
    render(<EmployeeNextTaskCard task={task} onOpen={onOpen} />);
    expect(screen.getByText(he.employeeNextTaskLabel)).toBeTruthy();
    expect(screen.getByText("מילוי מדף חלב")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: he.doTask }));
    expect(onOpen).toHaveBeenCalledWith(task);
  });

  it("offers to resume a task that is already in progress", () => {
    render(<EmployeeNextTaskCard task={card({ status: "in_progress" })} onOpen={vi.fn()} />);
    expect(screen.getByRole("button", { name: he.employeeNextTaskResume })).toBeTruthy();
    expect(screen.queryByRole("button", { name: he.doTask })).toBeNull();
  });

  it("flags an overdue task", () => {
    render(<EmployeeNextTaskCard task={card({ status: "overdue" })} onOpen={vi.fn()} />);
    expect(screen.getByText(he.alertOverdue)).toBeTruthy();
  });
});
