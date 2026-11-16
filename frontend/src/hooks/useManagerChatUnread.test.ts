import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useManagerChatUnread } from "./useManagerChatUnread";
import { directChatService, type DirectChatCard } from "../services/directChatService";
import { taskService } from "../services/taskService";

const listeners = vi.hoisted(() => ({ task: [] as (() => void)[] }));

vi.mock("../services/directChatService", () => ({ directChatService: { inbox: vi.fn() } }));
vi.mock("../services/taskService", () => ({ taskService: { listManagerAllDayChats: vi.fn() } }));
vi.mock("./useDirectChatLiveSync", () => ({ useDirectChatLiveSync: () => undefined }));
vi.mock("./useTaskChangeListener", () => ({ useTaskChangeListener: (cb: () => void) => { listeners.task.push(cb); } }));

function card(id: string, branchId: string | null, unread: number): DirectChatCard {
  return {
    id: `c-${id}`, kind: "down", counterpart_user_id: id, counterpart_name: id, counterpart_role: "employee",
    branch_id: branchId, branch_name: null, last_preview: null, last_at: null, unread_count: unread, direct_unread_count: unread,
  };
}

function taskChat(id: string, branchId: string, unread: number) {
  return { id, title: id, status: "in_progress" as const, last_preview: null, last_at: null, unread_count: unread, assignee_user_id: "e9", branch_id: branchId };
}

beforeEach(() => {
  listeners.task = [];
  vi.mocked(directChatService.inbox).mockReset();
  vi.mocked(taskService.listManagerAllDayChats).mockReset();
  vi.mocked(directChatService.inbox).mockResolvedValue({ items: [card("e1", "b1", 2), card("e2", "b2", 5)], up: null, unread_count: 7 });
  vi.mocked(taskService.listManagerAllDayChats).mockResolvedValue({ items: [taskChat("o1", "b1", 3)] });
});

describe("useManagerChatUnread", () => {
  it("adds the day's task threads to the direct unread, for the whole network", async () => {
    const { result } = renderHook(() => useManagerChatUnread(""));
    await waitFor(() => expect(result.current).toBe(2 + 5 + 3));
  });

  it("counts only the chosen snif, and follows a change without reloading", async () => {
    const { result, rerender } = renderHook(({ branch }) => useManagerChatUnread(branch), { initialProps: { branch: "b2" } });
    await waitFor(() => expect(result.current).toBe(5));
    rerender({ branch: "b1" });
    expect(result.current).toBe(2 + 3);
    expect(directChatService.inbox).toHaveBeenCalledTimes(1);
  });

  it("refreshes when a task message arrives", async () => {
    const { result } = renderHook(() => useManagerChatUnread(""));
    await waitFor(() => expect(result.current).toBe(10));
    vi.mocked(taskService.listManagerAllDayChats).mockResolvedValue({ items: [taskChat("o1", "b1", 6)] });
    await act(async () => { listeners.task.at(-1)?.(); });
    await waitFor(() => expect(result.current).toBe(2 + 5 + 6));
  });

  it("keeps the direct count when the task threads cannot be loaded", async () => {
    vi.mocked(taskService.listManagerAllDayChats).mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useManagerChatUnread(""));
    await waitFor(() => expect(result.current).toBe(7));
  });
});
