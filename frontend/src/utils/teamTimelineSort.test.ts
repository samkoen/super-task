import { describe, expect, it } from "vitest";
import type { TeamMember, TimelineTask } from "../services/dashboardService";
import { memberUrgencyScore, sortTeamTimeline } from "./teamTimelineSort";

const NOW = new Date("2026-07-19T12:00:00+03:00").getTime();

function task(partial: Partial<TimelineTask> & Pick<TimelineTask, "id">): TimelineTask {
  return {
    title: "t",
    status: "pending",
    segment: "upcoming",
    due_at: "2026-07-19T18:00:00+03:00",
    started_at: null,
    completed_at: null,
    duration_minutes: null,
    elapsed_minutes: null,
    department_name: null,
    assignee_name: null,
    task_kind: "fixed",
    ...partial,
  };
}

function member(partial: Partial<TeamMember> & Pick<TeamMember, "user_id" | "full_name">): TeamMember {
  return {
    job_function: null,
    is_active: false,
    status: "idle",
    current_task_title: null,
    current_department_name: null,
    completed_today: 0,
    total_today: 0,
    open_tasks: 0,
    timeline: [],
    overdue_backlog: [],
    ...partial,
  };
}

describe("teamTimelineSort", () => {
  it("scores overdue higher than idle upcoming", () => {
    const overdue = member({
      user_id: "1",
      full_name: "א",
      timeline: [task({ id: "o", status: "overdue", segment: "overdue", due_at: "2026-07-17T10:00:00+03:00" })],
    });
    const calm = member({
      user_id: "2",
      full_name: "ב",
      timeline: [task({ id: "u", due_at: "2026-07-19T20:00:00+03:00" })],
    });
    expect(memberUrgencyScore(overdue, NOW)).toBeGreaterThan(memberUrgencyScore(calm, NOW));
  });

  it("sorts by urgency then name", () => {
    const a = member({
      user_id: "a",
      full_name: "אבי",
      timeline: [task({ id: "1", status: "overdue", segment: "overdue", due_at: "2026-07-18T09:00:00+03:00" })],
    });
    const b = member({ user_id: "b", full_name: "בני", timeline: [] });
    const c = member({
      user_id: "c",
      full_name: "גיל",
      timeline: [task({ id: "2", status: "overdue", segment: "overdue", due_at: "2026-07-10T09:00:00+03:00" })],
    });
    const sorted = sortTeamTimeline([b, a, c], "urgency", NOW);
    expect(sorted.map((m) => m.user_id)).toEqual(["c", "a", "b"]);
  });

  it("sorts by Hebrew name", () => {
    const sorted = sortTeamTimeline(
      [
        member({ user_id: "2", full_name: "יוסי" }),
        member({ user_id: "1", full_name: "אבי" }),
      ],
      "name",
      NOW,
    );
    expect(sorted.map((m) => m.full_name)).toEqual(["אבי", "יוסי"]);
  });

  it("sorts in_progress first", () => {
    const idle = member({ user_id: "1", full_name: "אבי", status: "idle" });
    const busy = member({ user_id: "2", full_name: "בני", status: "in_progress", is_active: true });
    const sorted = sortTeamTimeline([idle, busy], "in_progress", NOW);
    expect(sorted[0].user_id).toBe("2");
  });

  it("sorts by open_tasks workload", () => {
    const light = member({ user_id: "1", full_name: "אבי", open_tasks: 1 });
    const heavy = member({ user_id: "2", full_name: "בני", open_tasks: 5 });
    const sorted = sortTeamTimeline([light, heavy], "workload", NOW);
    expect(sorted[0].user_id).toBe("2");
  });
});
