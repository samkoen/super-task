import { describe, expect, it } from "vitest";
import type { BranchSummary, ManagerMyWork, TeamMember, TimelineTask } from "../services/dashboardService";
import type { DirectChatCard } from "../services/directChatService";
import {
  buildManagerInbox,
  buildNetworkOverview,
  buildPeriodProgress,
  buildTeamNow,
  chatsForScope,
  homeTitle,
  ownTasksSummary,
  periodOf,
} from "./managerHome";

const at = (hour: number) => new Date(2026, 10, 16, hour, 0).toISOString();

function task(id: string, patch: Partial<TimelineTask> = {}): TimelineTask {
  return {
    id, title: `משימה ${id}`, status: "pending", segment: "upcoming", due_at: at(9),
    started_at: null, completed_at: null, duration_minutes: null, elapsed_minutes: null,
    department_name: null, assignee_name: "דני", task_kind: "fixed", ...patch,
  } as TimelineTask;
}

function member(id: string, name: string, patch: Partial<TeamMember> = {}): TeamMember {
  return {
    user_id: id, full_name: name, job_function: null, is_active: true, status: "active",
    current_task_title: null, current_department_name: null, completed_today: 0, total_today: 3,
    open_tasks: 3, timeline: [], overdue_backlog: [], ...patch,
  };
}

const queues = (patch: Partial<Record<"completed" | "pending_review" | "in_progress" | "upcoming", TimelineTask[]>>) => ({
  completed: [], pending_review: [], in_progress: [], upcoming: [], ...patch,
});

describe("periodOf", () => {
  it("splits the day at noon and 17:00", () => {
    expect(periodOf(at(6))).toBe("morning");
    expect(periodOf(at(12))).toBe("noon");
    expect(periodOf(at(16))).toBe("noon");
    expect(periodOf(at(17))).toBe("evening");
  });
});

describe("buildPeriodProgress", () => {
  it("counts sent and approved tasks as done, once per task", () => {
    const done = task("a", { status: "completed", segment: "completed" });
    const rows = buildPeriodProgress(queues({
      completed: [done],
      pending_review: [task("b", { status: "pending_review", segment: "pending_review", due_at: at(13) })],
      upcoming: [task("c", { due_at: at(19) }), done],
    }));
    expect(rows).toEqual([
      { period: "morning", total: 1, done: 1 },
      { period: "noon", total: 1, done: 1 },
      { period: "evening", total: 1, done: 0 },
    ]);
  });

  it("returns empty periods without queues", () => {
    expect(buildPeriodProgress(null).every((r) => r.total === 0)).toBe(true);
  });
});

describe("buildManagerInbox", () => {
  const chat = { counterpart_user_id: "u9", counterpart_name: "רונית", branch_name: "חיפה", last_preview: "בוקר טוב", unread_count: 1 } as DirectChatCard;

  it("puts questions first, then proofs to approve, then direct messages", () => {
    const items = buildManagerInbox(queues({
      pending_review: [task("r", { status: "pending_review", segment: "pending_review", completed_at: at(8) })],
      in_progress: [task("q", { status: "awaiting_response", segment: "awaiting_response", chat_unread_count: 1 })],
    }), [chat]);
    expect(items.map((i) => i.kind)).toEqual(["question", "review", "chat"]);
    expect(items[0]).toMatchObject({ taskId: "q", who: "דני" });
    expect(items[2]).toMatchObject({ title: "רונית", preview: "בוקר טוב", chat });
  });

  it("is empty when nothing waits for the manager", () => {
    expect(buildManagerInbox(null, [])).toEqual([]);
  });
});

describe("buildTeamNow", () => {
  it("puts idle oveds first and keeps those who have not worked yet today", () => {
    const arrived = task("s", { status: "completed", segment: "completed", started_at: at(7) });
    const entries = buildTeamNow([
      member("1", "דני", { status: "in_progress", current_task_title: "מילוי מדף" }),
      member("2", "מאיה"),
      member("3", "יוסי", { timeline: [arrived] }),
      member("4", "רונית", { completed_today: 3 }),
      member("5", "אבי", { is_active: false }),
    ]);
    expect(entries.map((e) => [e.name, e.state])).toEqual([
      ["יוסי", "idle"], ["דני", "working"], ["אבי", "notArrived"], ["מאיה", "notArrived"], ["רונית", "done"],
    ]);
    expect(entries[1].detail).toBe("מילוי מדף");
    expect(entries[0].initial).toBe("י");
  });
});

describe("ownTasksSummary", () => {
  const empty: ManagerMyWork = {
    urgent_tasks: [], in_progress_tasks: [], awaiting_response_tasks: [], pending_review_tasks: [],
    today_tasks: [], completed_tasks: [], progress_percent: 0,
  };
  const card = (id: string, hour: number) => ({ id, due_at: at(hour), status: "pending" }) as ManagerMyWork["today_tasks"][number];

  it("returns null when the manager has nothing to do", () => {
    expect(ownTasksSummary(empty)).toBeNull();
    expect(ownTasksSummary(null)).toBeNull();
  });

  it("counts open tasks once and flags lateness", () => {
    const summary = ownTasksSummary({ ...empty, today_tasks: [card("a", 11), card("b", 9)], in_progress_tasks: [card("a", 11)] }, new Date(2026, 10, 16, 10).getTime());
    expect(summary).toEqual({ open: 2, nextAt: at(9), late: true });
  });
});

describe("homeTitle", () => {
  it("names the branch, or the whole network when no branch is in scope", () => {
    expect(homeTitle({ branch: { id: "b", name: "שפע בבא סאלי", network_id: "n" } }, "x", "כל הרשת")).toBe("שפע בבא סאלי");
    expect(homeTitle({ branch: null }, "x", "כל הרשת")).toBe("כל הרשת");
    expect(homeTitle(null, "סניף הבית", "כל הרשת")).toBe("סניף הבית");
  });
});

describe("chatsForScope", () => {
  const card = (id: string, branch: string | null) => ({ counterpart_user_id: id, branch_id: branch }) as DirectChatCard;

  it("keeps only the messages of the branch in view", () => {
    const chats = [card("1", "b1"), card("2", "b2"), card("3", null)];
    expect(chatsForScope(chats, "b1").map((c) => c.counterpart_user_id)).toEqual(["1", "3"]);
    expect(chatsForScope(chats, null)).toHaveLength(3);
  });
});

describe("buildNetworkOverview", () => {
  const b = (id: string, health: BranchSummary["health"], overdue: number, rate: number): BranchSummary => ({ branch_id: id, name: id, health, overdue, pending: 0, completion_rate: rate });

  it("keeps only orange and red branches in attention, worst first", () => {
    const view = buildNetworkOverview([b("ok", "green", 0, 0.9), b("o", "orange", 1, 0.5), b("r", "red", 4, 0.3), b("r2", "red", 6, 0.6)]);
    expect(view.healthy).toBe(1);
    expect(view.attention.map((x) => x.branch_id)).toEqual(["r2", "r", "o"]);
    expect(view.all.at(-1)?.branch_id).toBe("ok");
  });

  it("handles a network without branches", () => {
    expect(buildNetworkOverview(null)).toEqual({ healthy: 0, attention: [], all: [] });
  });
});
