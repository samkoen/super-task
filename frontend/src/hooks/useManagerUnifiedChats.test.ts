import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useManagerUnifiedChats } from "./useManagerUnifiedChats";
import { directChatService } from "../services/directChatService";
import { taskService } from "../services/taskService";

vi.mock("../services/directChatService", () => ({
  directChatService: { inbox: vi.fn() },
}));
vi.mock("../services/taskService", () => ({
  taskService: { listManagerDayChats: vi.fn() },
}));
vi.mock("./useDirectChatLiveSync", () => ({ useDirectChatLiveSync: () => undefined }));
vi.mock("./useTaskChangeListener", () => ({ useTaskChangeListener: () => undefined }));

const onError = vi.fn();

beforeEach(() => {
  onError.mockReset();
  vi.mocked(directChatService.inbox).mockResolvedValue({
    items: [
      { id: "c1", kind: "down", counterpart_user_id: "e1", counterpart_name: "דן", counterpart_role: "employee", branch_name: "תל אביב", last_preview: "שלום", last_at: "2026-09-14T10:00:00+03:00", unread_count: 0, direct_unread_count: 0 },
    ],
    up: null,
    unread_count: 0,
  });
  vi.mocked(taskService.listManagerDayChats).mockResolvedValue({
    items: [
      { id: "o1", title: "מדף", status: "awaiting_response", last_preview: "?", last_at: "2026-09-14T11:00:00+03:00", unread_count: 1 },
    ],
  });
});

describe("useManagerUnifiedChats", () => {
  it("fans task chats out per employee and merges into one sorted list", async () => {
    const { result } = renderHook(() => useManagerUnifiedChats(onError));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(taskService.listManagerDayChats).toHaveBeenCalledWith("e1");
    // Le fil de tâche attend le menahel (awaiting_response) : il passe en tête.
    expect(result.current.entries.map((e) => e.kind)).toEqual(["task", "direct"]);
  });

  it("keeps the inbox usable when one employee's task chats fail", async () => {
    vi.mocked(taskService.listManagerDayChats).mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useManagerUnifiedChats(onError));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entries.map((e) => e.kind)).toEqual(["direct"]);
    expect(onError).not.toHaveBeenCalled();
  });
});
