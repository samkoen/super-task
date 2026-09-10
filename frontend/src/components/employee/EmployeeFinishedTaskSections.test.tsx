import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import EmployeeFinishedTaskSections from "./EmployeeFinishedTaskSections";
import { he } from "../../i18n/he";
import type { EmployeeTaskCard } from "../../services/dashboardService";

function card(over: Partial<EmployeeTaskCard> & Pick<EmployeeTaskCard, "id" | "title">): EmployeeTaskCard {
  return {
    description: "",
    due_at: "2099-09-02T20:00:00+03:00",
    status: over.status ?? "completed",
    task_kind: "fixed",
    photo_required: false,
    department_name: null,
    started_at: null,
    ...over,
  };
}

describe("EmployeeFinishedTaskSections", () => {
  it("lists tasks waiting for menahel approval", () => {
    const onOpen = vi.fn();
    const task = card({ id: "p", title: "מילוי מדף", status: "pending_review" });
    render(
      <EmployeeFinishedTaskSections
        pendingReviewTasks={[task]}
        completedTasks={[]}
        showCompleted={false}
        onToggleCompleted={vi.fn()}
        onOpen={onOpen}
      />,
    );
    expect(screen.getByText(`${he.taskPendingReview} (1)`)).toBeTruthy();
    fireEvent.click(screen.getByText("מילוי מדף"));
    expect(onOpen).toHaveBeenCalledWith(task);
  });

  it("keeps the completed accordion visible even with no open work", () => {
    const onOpen = vi.fn();
    render(
      <EmployeeFinishedTaskSections
        pendingReviewTasks={[]}
        completedTasks={[card({ id: "c", title: "ניקוי רצפה", status: "completed" })]}
        showCompleted={false}
        onToggleCompleted={vi.fn()}
        onOpen={onOpen}
      />,
    );
    const toggle = screen.getByText(`${he.employeeShowCompleted} (1)`);
    fireEvent.click(toggle);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("opens a completed task from the accordion", () => {
    const onOpen = vi.fn();
    const task = card({ id: "c", title: "ניקוי רצפה", status: "completed" });
    render(
      <EmployeeFinishedTaskSections
        pendingReviewTasks={[]}
        completedTasks={[task]}
        showCompleted
        onToggleCompleted={vi.fn()}
        onOpen={onOpen}
      />,
    );
    fireEvent.click(screen.getByText("ניקוי רצפה"));
    expect(onOpen).toHaveBeenCalledWith(task);
  });
});
