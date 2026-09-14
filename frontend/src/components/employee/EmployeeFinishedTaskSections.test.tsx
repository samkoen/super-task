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
  it("puts pending-review tasks in the completed accordion", () => {
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
    expect(screen.queryByText(he.taskPendingReview)).toBeNull();
    expect(screen.getByText(`${he.employeeShowCompleted} (1)`)).toBeTruthy();
    expect(screen.getByText(he.taskStatusLabels.pending_review).closest(".MuiChip-colorInfo")).toBeTruthy();
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

  it("lists ichour then completed in the same accordion", () => {
    const onOpen = vi.fn();
    const pending = card({ id: "p", title: "מילוי מדף", status: "pending_review" });
    const done = card({ id: "c", title: "ניקוי רצפה", status: "completed" });
    render(
      <EmployeeFinishedTaskSections
        pendingReviewTasks={[pending]}
        completedTasks={[done]}
        showCompleted
        onToggleCompleted={vi.fn()}
        onOpen={onOpen}
      />,
    );
    expect(screen.getByText(`${he.employeeHideCompleted} (2)`)).toBeTruthy();
    expect(screen.getByText("מילוי מדף")).toBeTruthy();
    expect(screen.getByText("ניקוי רצפה")).toBeTruthy();
    fireEvent.click(screen.getByText("מילוי מדף"));
    expect(onOpen).toHaveBeenCalledWith(pending);
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

  it("lists the clock-in punch like other finished tasks", () => {
    const onOpen = vi.fn();
    const start = card({
      id: "s",
      title: "פתיחת משמרת",
      status: "pending_review",
      is_work_start: true,
    });
    render(
      <EmployeeFinishedTaskSections
        pendingReviewTasks={[start]}
        completedTasks={[
          card({ id: "e", title: "סיום משמרת", status: "completed", is_work_end: true }),
        ]}
        showCompleted
        onToggleCompleted={vi.fn()}
        onOpen={onOpen}
      />,
    );
    expect(screen.getByText(`${he.employeeHideCompleted} (2)`)).toBeTruthy();
    fireEvent.click(screen.getByText("פתיחת משמרת"));
    expect(onOpen).toHaveBeenCalledWith(start);
    expect(screen.getByText("סיום משמרת")).toBeTruthy();
  });
});
