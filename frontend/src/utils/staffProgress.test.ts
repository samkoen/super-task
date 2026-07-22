import { describe, expect, it } from "vitest";
import type { TeamMember, TimelineTask } from "../services/dashboardService";
import {
  computeArrivedAt,
  computeStaffProgress,
  computeStaffSegments,
  formatPresenceLabel,
  groupMemberTasks,
  segmentForTask,
  segmentPercents,
} from "./staffProgress";

function task(partial: Partial<TimelineTask> & Pick<TimelineTask, "id" | "status" | "segment">): TimelineTask {
  return {
    title: partial.title ?? partial.id,
    due_at: partial.due_at ?? "2026-07-14T10:00:00+03:00",
    started_at: partial.started_at ?? null,
    completed_at: partial.completed_at ?? null,
    duration_minutes: null,
    elapsed_minutes: null,
    department_name: null,
    assignee_name: null,
    task_kind: "fixed",
    ...partial,
  };
}

function member(timeline: TimelineTask[], backlog: TimelineTask[] = []): TeamMember {
  return {
    user_id: "u1",
    full_name: "יוסי",
    job_function: "stockers",
    is_active: true,
    status: "active",
    current_task_title: null,
    current_department_name: null,
    completed_today: 0,
    total_today: timeline.length,
    open_tasks: 0,
    timeline,
    overdue_backlog: backlog,
  };
}

describe("staffProgress segments", () => {
  it("maps statuses to the 4 bar colors", () => {
    expect(segmentForTask(task({ id: "1", status: "completed", segment: "completed" }))).toBe(
      "approved",
    );
    expect(
      segmentForTask(task({ id: "2", status: "pending_review", segment: "pending_review" })),
    ).toBe("awaiting_approval");
    expect(segmentForTask(task({ id: "3", status: "overdue", segment: "overdue" }))).toBe(
      "attention",
    );
    expect(segmentForTask(task({ id: "4", status: "in_progress", segment: "in_progress" }))).toBe(
      "attention",
    );
    expect(segmentForTask(task({ id: "5", status: "pending", segment: "upcoming" }))).toBe(
      "not_started",
    );
  });

  it("counts segments and arrival from first started_at", () => {
    const tasks = [
      task({
        id: "a",
        status: "completed",
        segment: "completed",
        started_at: "2026-07-14T09:30:00+03:00",
      }),
      task({
        id: "b",
        status: "pending_review",
        segment: "pending_review",
        started_at: "2026-07-14T08:15:00+03:00",
      }),
      task({ id: "c", status: "pending", segment: "upcoming" }),
      task({ id: "d", status: "overdue", segment: "overdue" }),
    ];
    expect(computeStaffSegments(tasks)).toEqual({
      approved: 1,
      awaiting_approval: 1,
      attention: 1,
      not_started: 1,
    });
    expect(computeArrivedAt(tasks)).toBe("2026-07-14T08:15:00+03:00");

    const progress = computeStaffProgress(member(tasks));
    expect(progress.total).toBe(4);
    expect(progress.departureTime).toBe("15:00");
    expect(progress.arrivedAt).toBe("2026-07-14T08:15:00+03:00");
  });

  it("returns not arrived when no started_at", () => {
    expect(computeArrivedAt([task({ id: "1", status: "pending", segment: "upcoming" })])).toBeNull();
    expect(
      formatPresenceLabel(null, "15:00", {
        arrival: "הגעה",
        departure: "יציאה",
        notArrived: "טרם הגיע",
      }),
    ).toBe("טרם הגיע");
  });

  it("distributes percents to 100", () => {
    const pct = segmentPercents(
      { approved: 1, awaiting_approval: 1, attention: 1, not_started: 0 },
      3,
    );
    expect(pct.approved + pct.awaiting_approval + pct.attention + pct.not_started).toBe(100);
  });

  it("groups accordion lists", () => {
    const grouped = groupMemberTasks([
      task({ id: "1", status: "in_progress", segment: "in_progress" }),
      task({ id: "2", status: "completed", segment: "completed" }),
      task({ id: "3", status: "pending", segment: "upcoming" }),
    ]);
    expect(grouped.inProgress.map((t) => t.id)).toEqual(["1"]);
    expect(grouped.completed.map((t) => t.id)).toEqual(["2"]);
    expect(grouped.waiting.map((t) => t.id)).toEqual(["3"]);
  });
});
