import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ActionRequiredCarousel from "./ActionRequiredCarousel";
import { he } from "../../i18n/he";
import type { TaskQueues } from "../../services/dashboardService";

const queues: TaskQueues = {
  completed: [],
  in_progress: [],
  upcoming: [],
  pending_review: [
    {
      id: "pr1",
      title: "ניקוי מדף",
      status: "pending_review",
      segment: "pending_review",
      due_at: "2026-07-14T10:00:00+03:00",
      started_at: null,
      completed_at: "2026-07-14T09:30:00+03:00",
      duration_minutes: null,
      elapsed_minutes: null,
      department_name: "יבשים",
      assignee_name: "יוסי",
      task_kind: "fixed",
    },
  ],
};

describe("ActionRequiredCarousel", () => {
  it("renders review cards and calls onReviewTask", () => {
    const onReview = vi.fn();
    render(<ActionRequiredCarousel queues={queues} onReviewTask={onReview} />);
    expect(screen.getByText(he.dashboardActionQueue)).toBeTruthy();
    expect(screen.getByText("ניקוי מדף")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: he.taskReviewAction }));
    expect(onReview).toHaveBeenCalledWith("pr1");
  });

  it("shows empty state", () => {
    render(
      <ActionRequiredCarousel
        queues={{ completed: [], in_progress: [], pending_review: [], upcoming: [] }}
      />,
    );
    expect(screen.getByText(he.dashboardActionQueueEmpty)).toBeTruthy();
  });
});
