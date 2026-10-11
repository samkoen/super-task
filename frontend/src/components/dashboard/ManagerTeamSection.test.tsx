import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ManagerTeamSection from "./ManagerTeamSection";
import { he } from "../../i18n/he";
import type { ManagerDashboard, TimelineTask } from "../../services/dashboardService";

function task(partial: Partial<TimelineTask> & Pick<TimelineTask, "id" | "status" | "segment">): TimelineTask {
  return {
    title: partial.title ?? partial.id,
    due_at: "2026-07-14T10:00:00+03:00",
    started_at: null,
    completed_at: partial.completed_at ?? null,
    duration_minutes: null,
    elapsed_minutes: null,
    department_name: "ירקות",
    assignee_name: "יוסי",
    task_kind: "fixed",
    ...partial,
  };
}

function dash(queues: ManagerDashboard["task_queues"]): ManagerDashboard {
  return {
    due_on: "2026-07-14",
    branch: { id: "b1", name: "סניף", network_id: "n1" },
    health: "green",
    counts: {
      tasks_total: 2,
      tasks_completed: 1,
      tasks_pending: 0,
      tasks_in_progress: 1,
      tasks_overdue: 0,
      tasks_cancelled: 0,
      completion_rate: 0.5,
    },
    by_department: [],
    team: [],
    task_queues: queues,
    unfinished_tasks: [],
    recent_alerts: [],
    branches: [],
  };
}

const queues = {
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
    task({ id: "ip1", title: "מילוי מדף", status: "in_progress", segment: "in_progress" }),
  ],
  pending_review: [],
  upcoming: [],
};

describe("ManagerTeamSection", () => {
  it("opens a closed task in the review window, and an open task in the editor", () => {
    const onReviewTask = vi.fn();
    const onOpenTask = vi.fn();
    render(
      <ManagerTeamSection
        data={dash(queues)}
        showAnalysis={false}
        onToggleAnalysis={vi.fn()}
        onOpenTask={onOpenTask}
        onReviewTask={onReviewTask}
        onChanged={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText(`${he.openTask}: ניקוי רצפה`));
    fireEvent.click(screen.getByLabelText(`${he.openTask}: מילוי מדף`));
    expect(onReviewTask).toHaveBeenCalledWith("done1");
    expect(onOpenTask).toHaveBeenCalledWith("ip1");
    expect(onReviewTask).not.toHaveBeenCalledWith("ip1");
    expect(onOpenTask).not.toHaveBeenCalledWith("done1");
  });
});
