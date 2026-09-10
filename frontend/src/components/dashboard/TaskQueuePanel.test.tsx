import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import TaskQueuePanel from "./TaskQueuePanel";
import { he } from "../../i18n/he";
import type { TimelineTask } from "../../services/dashboardService";

function completedTask(): TimelineTask {
  return {
    id: "done-1",
    title: "מדף חלב",
    status: "completed",
    segment: "completed",
    due_at: "2026-09-10T12:00:00+03:00",
    started_at: "2026-09-10T10:00:00+03:00",
    completed_at: "2026-09-10T11:00:00+03:00",
    duration_minutes: 60,
    elapsed_minutes: null,
    department_name: null,
    assignee_name: "ראובן",
    task_kind: "ad_hoc",
  };
}

describe("TaskQueuePanel", () => {
  it("opens closed task detail from the completed queue", () => {
    const onReviewTask = vi.fn();
    render(
      <TaskQueuePanel
        queues={{ completed: [completedTask()], in_progress: [], pending_review: [], upcoming: [] }}
        onReviewTask={onReviewTask}
      />,
    );
    fireEvent.click(screen.getByText(he.dashboardTaskQueues));
    fireEvent.click(screen.getByRole("tab", { name: `${he.dashboardQueueCompleted} (1)` }));
    fireEvent.click(screen.getByRole("button", { name: he.taskClosedDetailAction }));
    expect(onReviewTask).toHaveBeenCalledWith("done-1");
  });

  it("shows an empty completed list without an action", () => {
    render(
      <TaskQueuePanel
        queues={{ completed: [], in_progress: [], pending_review: [], upcoming: [] }}
      />,
    );
    fireEvent.click(screen.getByText(he.dashboardTaskQueues));
    expect(screen.queryByRole("button", { name: he.taskClosedDetailAction })).toBeNull();
    expect(screen.getByText(he.noTasks)).toBeTruthy();
  });
});
