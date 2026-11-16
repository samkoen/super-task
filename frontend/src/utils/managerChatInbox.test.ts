import { describe, expect, it } from "vitest";
import type { DirectChatCard } from "../services/directChatService";
import type { ManagerDayTaskChat } from "../services/taskService";
import {
  buildManagerInboxEntries,
  directUnreadOf,
  filterManagerInbox,
  sortManagerInbox,
  taskWaitsForManager,
  type ManagerEmployeeTaskChats,
} from "./managerChatInbox";

function card(overrides: Partial<DirectChatCard> = {}): DirectChatCard {
  return {
    id: "c1",
    kind: "down",
    counterpart_user_id: "e1",
    counterpart_name: "דן כהן",
    counterpart_role: "employee",
    branch_name: "תל אביב",
    last_preview: "שלום",
    last_at: "2026-09-14T10:00:00+03:00",
    unread_count: 0,
    direct_unread_count: 0,
    task_unread_count: 0,
    ...overrides,
  };
}

function taskChat(overrides: Partial<ManagerDayTaskChat> = {}): ManagerDayTaskChat {
  return {
    id: "o1",
    title: "מדף",
    status: "in_progress",
    last_preview: "היי",
    last_at: "2026-09-14T11:00:00+03:00",
    unread_count: 0,
    ...overrides,
  };
}

function withTasks(c: DirectChatCard, tasks: ManagerDayTaskChat[]): ManagerEmployeeTaskChats {
  return { card: c, tasks };
}

describe("managerChatInbox", () => {
  it("mixes directs and task threads into one flat list", () => {
    const dan = card();
    const entries = buildManagerInboxEntries([dan], [withTasks(dan, [taskChat()])]);
    expect(entries.map((e) => e.kind)).toEqual(["direct", "task"]);
    expect(entries[0]).toMatchObject({ kind: "direct", title: "דן כהן", context: "תל אביב" });
    expect(entries[1]).toMatchObject({ kind: "task", title: "מדף", context: "דן כהן" });
    expect(entries[1].task).toMatchObject({ occurrenceId: "o1", employeeId: "e1" });
  });

  it("marks a thread as waiting on unread or a manager-action status", () => {
    expect(taskWaitsForManager("in_progress", 0)).toBe(false);
    expect(taskWaitsForManager("in_progress", 2)).toBe(true);
    expect(taskWaitsForManager("awaiting_response", 0)).toBe(true);
    expect(taskWaitsForManager("pending_review", 0)).toBe(true);
    expect(directUnreadOf(card({ direct_unread_count: 4, unread_count: 9 }))).toBe(4);
  });

  it("sorts waiting items first, then by most recent", () => {
    const old = card({ counterpart_user_id: "a", last_at: "2026-09-14T08:00:00+03:00" });
    const recent = card({ counterpart_user_id: "b", last_at: "2026-09-14T12:00:00+03:00" });
    const waiting = card({ counterpart_user_id: "c", last_at: "2026-09-14T07:00:00+03:00", direct_unread_count: 1 });
    const entries = buildManagerInboxEntries([old, recent, waiting], []);
    expect(sortManagerInbox(entries).map((e) => e.direct?.counterpart_user_id)).toEqual(["c", "b", "a"]);
  });

  it("filters by pill and by search text", () => {
    const dan = card();
    const entries = buildManagerInboxEntries([dan], [withTasks(dan, [taskChat()])]);
    expect(filterManagerInbox(entries, "tasks", "").map((e) => e.kind)).toEqual(["task"]);
    expect(filterManagerInbox(entries, "directs", "").map((e) => e.kind)).toEqual(["direct"]);
    expect(filterManagerInbox(entries, "all", "תל").map((e) => e.kind)).toEqual(["direct"]);
    expect(filterManagerInbox(entries, "all", "מדף").map((e) => e.kind)).toEqual(["task"]);
    expect(filterManagerInbox(entries, "all", "ירושלים")).toEqual([]);
  });
});
