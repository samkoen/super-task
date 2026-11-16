import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { groupTaskChatsByOved, useManagerUnifiedChats } from "./useManagerUnifiedChats";
import { directChatService, type DirectChatCard } from "../services/directChatService";
import { taskService } from "../services/taskService";

vi.mock("../services/directChatService", () => ({
  directChatService: { inbox: vi.fn() },
}));
vi.mock("../services/taskService", () => ({
  taskService: { listManagerAllDayChats: vi.fn() },
}));
vi.mock("./useDirectChatLiveSync", () => ({ useDirectChatLiveSync: () => undefined }));
vi.mock("./useTaskChangeListener", () => ({ useTaskChangeListener: () => undefined }));

const onError = vi.fn();

function card(id: string, kind: "down" | "up" = "down"): DirectChatCard {
  return {
    id: `c-${id}`,
    kind,
    counterpart_user_id: id,
    counterpart_name: id,
    counterpart_role: "employee",
    branch_name: "תל אביב",
    last_preview: "שלום",
    last_at: "2026-09-14T10:00:00+03:00",
    unread_count: 0,
    direct_unread_count: 0,
  } as DirectChatCard;
}

function task(id: string, assignee: string | null) {
  return {
    id,
    title: "מדף",
    status: "awaiting_response" as const,
    last_preview: "?",
    last_at: "2026-09-14T11:00:00+03:00",
    unread_count: 1,
    assignee_user_id: assignee,
  };
}

beforeEach(() => {
  onError.mockReset();
  vi.mocked(directChatService.inbox).mockResolvedValue({
    items: [card("e1")],
    up: null,
    unread_count: 0,
  });
  vi.mocked(taskService.listManagerAllDayChats).mockResolvedValue({ items: [task("o1", "e1")] });
});

describe("groupTaskChatsByOved", () => {
  it("attaches each task to its oved and ignores the up card", () => {
    const groups = groupTaskChatsByOved(
      [card("nm", "up"), card("e1"), card("e2")],
      [task("o1", "e1"), task("o2", "e2"), task("o3", "e1")],
    );
    expect(groups.map((g) => [g.card.counterpart_user_id, g.tasks.map((t) => t.id)])).toEqual([
      ["e1", ["o1", "o3"]],
      ["e2", ["o2"]],
    ]);
  });

  it("keeps the threads of an oved missing from the direct inbox, named from the task", () => {
    const groups = groupTaskChatsByOved([card("e1")], [{ ...task("o1", "e9"), assignee_name: "רונית לוי", branch_id: "b2" }]);
    expect(groups).toHaveLength(2);
    const extra = groups[1];
    expect(extra.card).toMatchObject({ counterpart_user_id: "e9", counterpart_name: "רונית לוי", kind: "down", branch_id: "b2" });
    expect(extra.tasks.map((t) => t.id)).toEqual(["o1"]);
  });

  it("drops only tasks without any oved", () => {
    const groups = groupTaskChatsByOved([card("e1")], [task("o2", null)]);
    expect(groups.map((g) => g.tasks.length)).toEqual([0]);
  });
});

describe("useManagerUnifiedChats", () => {
  it("loads every task chat in one call and merges into one sorted list", async () => {
    const { result } = renderHook(() => useManagerUnifiedChats(onError));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(taskService.listManagerAllDayChats).toHaveBeenCalledTimes(1);
    // Le fil de tâche attend le menahel (awaiting_response) : il passe en tête.
    expect(result.current.entries.map((e) => e.kind)).toEqual(["task", "direct"]);
  });

  it("shows a task thread without adding a direct row for an oved absent from the inbox", async () => {
    vi.mocked(taskService.listManagerAllDayChats).mockResolvedValue({ items: [{ ...task("o9", "e9"), assignee_name: "רונית לוי" }] });
    const { result } = renderHook(() => useManagerUnifiedChats(onError));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entries.map((e) => e.key)).toEqual(["task-o9", "direct-down-e1"]);
    expect(result.current.entries[0].context).toBe("רונית לוי");
  });

  it("keeps the inbox usable when the task chats call fails", async () => {
    vi.mocked(taskService.listManagerAllDayChats).mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useManagerUnifiedChats(onError));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entries.map((e) => e.kind)).toEqual(["direct"]);
    expect(onError).not.toHaveBeenCalled();
  });
});
