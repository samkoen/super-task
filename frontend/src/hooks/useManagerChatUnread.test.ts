import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useManagerChatUnread } from "./useManagerChatUnread";
import { directChatService, type DirectChatCard } from "../services/directChatService";

vi.mock("../services/directChatService", () => ({ directChatService: { inbox: vi.fn() } }));
vi.mock("./useDirectChatLiveSync", () => ({ useDirectChatLiveSync: () => undefined }));

function card(id: string, branchId: string | null, unread: number): DirectChatCard {
  return {
    id: `c-${id}`, kind: "down", counterpart_user_id: id, counterpart_name: id, counterpart_role: "employee",
    branch_id: branchId, branch_name: null, last_preview: null, last_at: null, unread_count: unread,
  };
}

beforeEach(() => {
  vi.mocked(directChatService.inbox).mockReset();
  vi.mocked(directChatService.inbox).mockResolvedValue({
    items: [card("e1", "b1", 2), card("e2", "b2", 5)],
    up: null,
    unread_count: 7,
  });
});

describe("useManagerChatUnread", () => {
  it("counts every conversation for the whole network", async () => {
    const { result } = renderHook(() => useManagerChatUnread(""));
    await waitFor(() => expect(result.current).toBe(7));
  });

  it("counts only the chosen snif, and follows a change without reloading", async () => {
    const { result, rerender } = renderHook(({ branch }) => useManagerChatUnread(branch), { initialProps: { branch: "b2" } });
    await waitFor(() => expect(result.current).toBe(5));
    rerender({ branch: "b1" });
    expect(result.current).toBe(2);
    expect(directChatService.inbox).toHaveBeenCalledTimes(1);
  });

  it("stays at zero when the inbox cannot be loaded", async () => {
    vi.mocked(directChatService.inbox).mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() => useManagerChatUnread("b1"));
    await waitFor(() => expect(directChatService.inbox).toHaveBeenCalled());
    expect(result.current).toBe(0);
  });
});
