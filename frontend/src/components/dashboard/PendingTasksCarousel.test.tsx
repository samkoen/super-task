import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import PendingTasksCarousel from "./PendingTasksCarousel";
import { he } from "../../i18n/he";
import type { TaskQueues, TimelineTask } from "../../services/dashboardService";

function task(partial: Partial<TimelineTask> & Pick<TimelineTask, "id" | "status" | "segment">): TimelineTask {
  return {
    title: partial.title ?? partial.id,
    due_at: partial.due_at ?? "2026-07-14T10:00:00+03:00",
    started_at: null,
    completed_at: partial.completed_at ?? null,
    duration_minutes: null,
    elapsed_minutes: null,
    department_name: partial.department_name ?? "ירקות",
    assignee_name: partial.assignee_name ?? "יוסי",
    task_kind: "fixed",
    ...partial,
  };
}

const queues: TaskQueues = {
  completed: [
    task({
      id: "done1",
      title: "ניקוי רצפה",
      status: "completed",
      segment: "completed",
      completed_at: "2026-07-14T09:00:00+03:00",
    }),
  ],
  in_progress: [
    task({
      id: "ip1",
      title: "מילוי מדף",
      status: "in_progress",
      segment: "in_progress",
    }),
  ],
  pending_review: [],
  upcoming: [],
};

describe("PendingTasksCarousel", () => {
  it("lists open work in the pending carousel", () => {
    render(<PendingTasksCarousel queues={queues} onOpenTask={vi.fn()} />);
    expect(screen.getByText(he.dashboardPendingCarousel)).toBeTruthy();
    expect(screen.getByText("מילוי מדף")).toBeTruthy();
    expect(screen.queryByText("ניקוי רצפה")).toBeNull();
  });

  it("lists finished tasks in the completed carousel", () => {
    const onOpen = vi.fn();
    render(<PendingTasksCarousel kind="completed" queues={queues} onOpenTask={onOpen} />);
    expect(screen.getByText(he.dashboardCompletedCarousel)).toBeTruthy();
    expect(screen.getByText("ניקוי רצפה")).toBeTruthy();
    expect(screen.queryByText("מילוי מדף")).toBeNull();
    fireEvent.click(screen.getByLabelText(`${he.openTask}: ניקוי רצפה`));
    expect(onOpen).toHaveBeenCalledWith(queues.completed[0]);
  });

  it("shows an empty completed state", () => {
    render(
      <PendingTasksCarousel
        kind="completed"
        queues={{ ...queues, completed: [] }}
      />,
    );
    expect(screen.getByText(he.dashboardCompletedCarouselEmpty)).toBeTruthy();
  });
});
