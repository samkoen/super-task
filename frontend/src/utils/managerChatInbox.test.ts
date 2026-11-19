import { describe, expect, it } from "vitest";
import type { DirectChatCard } from "../services/directChatService";
import type { ManagerDayTaskChat } from "../services/taskService";
import {
  buildManagerInboxEntries,
  directUnreadOf,
  filterManagerInbox,
  scopeManagerInbox,
  managerChatsUnread,
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

  it("filters what waits for the manager and proofs to approve", () => {
    const dan = card();
    const pending = taskChat({ id: "p", status: "pending_review", chat_status: "pending_review" });
    const quiet = taskChat({ id: "q", status: "in_progress", unread_count: 0 });
    const entries = buildManagerInboxEntries([dan], [withTasks(dan, [pending, quiet])]);
    expect(filterManagerInbox(entries, "action", "").map((e) => e.key)).toEqual(["task-p"]);
    expect(filterManagerInbox(entries, "pending", "").map((e) => e.key)).toEqual(["task-p"]);
    expect(entries.find((e) => e.key === "task-p")?.avatarName).toBe(dan.counterpart_name);
  });
});

describe("scopeManagerInbox", () => {
  const entries = buildManagerInboxEntries(
    [
      card({ counterpart_user_id: "e1", branch_id: "b1" }),
      card({ counterpart_user_id: "e2", branch_id: "b2" }),
      card({ id: null, kind: "up", counterpart_user_id: "nm", branch_id: null }),
    ],
    [{ card: card({ counterpart_user_id: "e2", branch_id: "b2" }), tasks: [taskChat({ id: "o2", branch_id: "b2" })] }],
  );

  it("keeps the chosen branch plus the rows outside any branch", () => {
    const keys = scopeManagerInbox(entries, "b2").map((e) => e.key);
    expect(keys).toEqual(["direct-down-e2", "direct-up-nm", "task-o2"]);
  });

  it("keeps everything for the whole network", () => {
    expect(scopeManagerInbox(entries, "")).toHaveLength(entries.length);
  });

  it("falls back to the oved's branch when the task card has none", () => {
    const [entry] = buildManagerInboxEntries([], [{ card: card({ branch_id: "b1" }), tasks: [taskChat({ branch_id: null })] }]);
    expect(entry.branchId).toBe("b1");
  });
});

describe("managerChatsUnread", () => {
  const up = card({ id: null, kind: "up", counterpart_user_id: "nm", branch_id: null, unread_count: 1, direct_unread_count: 1 });
  const directs = [
    up,
    card({ counterpart_user_id: "e1", branch_id: "b1", unread_count: 9, direct_unread_count: 2 }),
    card({ counterpart_user_id: "e2", branch_id: "b2", unread_count: 5, direct_unread_count: 5 }),
  ];
  const tasks = [
    taskChat({ id: "o1", branch_id: "b1", unread_count: 4 }),
    // Oved sans conversation directe : ses non-lus de tâche comptent quand même.
    taskChat({ id: "o9", assignee_user_id: "e9", branch_id: "b1", unread_count: 3 }),
    taskChat({ id: "o2", branch_id: "b2", unread_count: 7 }),
  ];

  it("counts direct unread (not the task part folded in the card) plus each task thread, for the whole network", () => {
    expect(managerChatsUnread(directs, tasks, "")).toBe(1 + 2 + 5 + 4 + 3 + 7);
  });

  it("restricts to the chosen snif, keeping my manager", () => {
    expect(managerChatsUnread(directs, tasks, "b1")).toBe(1 + 2 + 4 + 3);
  });

  it("counts my manager once and never goes negative", () => {
    expect(managerChatsUnread([up, up], [], "b1")).toBe(1);
    expect(managerChatsUnread([], [taskChat({ unread_count: -2 })], "")).toBe(0);
  });
});
