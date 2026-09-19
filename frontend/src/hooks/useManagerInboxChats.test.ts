import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useManagerInboxChats } from "./useManagerInboxChats";
import { directChatService } from "../services/directChatService";

vi.mock("../services/directChatService", () => ({
  directChatService: {
    inbox: vi.fn(),
    openWith: vi.fn(),
    openMine: vi.fn(),
  },
}));

describe("useManagerInboxChats", () => {
  beforeEach(() => {
    vi.mocked(directChatService.inbox).mockResolvedValue({
      items: [
        {
          id: "c1",
          kind: "down",
          counterpart_user_id: "e1",
          counterpart_name: "ראובן",
          counterpart_role: "employee",
          last_preview: "היי",
          last_at: "2026-09-19T10:00:00+03:00",
          unread_count: 1,
        },
      ],
      up: null,
      unread_count: 1,
    });
  });

  it("loads unread clali chats", async () => {
    const { result } = renderHook(() => useManagerInboxChats());
    await waitFor(() => expect(result.current.chats).toHaveLength(1));
    expect(result.current.chats[0].counterpart_name).toBe("ראובן");
  });

  it("opens a downward conversation", async () => {
    vi.mocked(directChatService.openWith).mockResolvedValue({
      conversation: { id: "conv-1" },
      messages: [],
      peer: null,
    });
    const { result } = renderHook(() => useManagerInboxChats());
    await waitFor(() => expect(result.current.chats).toHaveLength(1));
    await act(async () => {
      await result.current.openCard(result.current.chats[0]);
    });
    expect(result.current.openChat).toEqual({ id: "conv-1", title: "ראובן" });
  });
});
