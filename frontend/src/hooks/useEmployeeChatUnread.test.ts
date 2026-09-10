import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useEmployeeChatUnread } from "./useEmployeeChatUnread";
import { directChatService } from "../services/directChatService";

vi.mock("../services/directChatService", () => ({
  directChatService: { inbox: vi.fn() },
}));

vi.mock("./useDirectChatLiveSync", () => ({
  useDirectChatLiveSync: () => undefined,
}));

describe("useEmployeeChatUnread", () => {
  beforeEach(() => {
    vi.mocked(directChatService.inbox).mockReset();
  });

  it("exposes the inbox unread count for the oved", async () => {
    vi.mocked(directChatService.inbox).mockResolvedValue({
      items: [],
      up: null,
      unread_count: 4,
      managers: [],
    });
    const { result } = renderHook(() => useEmployeeChatUnread(true, "employee"));
    await waitFor(() => expect(result.current).toBe(4));
  });

  it("stays at zero when the chrome is off", async () => {
    vi.mocked(directChatService.inbox).mockResolvedValue({
      items: [],
      up: null,
      unread_count: 9,
      managers: [],
    });
    const { result } = renderHook(() => useEmployeeChatUnread(false, "employee"));
    expect(result.current).toBe(0);
    expect(directChatService.inbox).not.toHaveBeenCalled();
  });
});
