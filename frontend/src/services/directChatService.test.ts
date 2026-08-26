import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock("./api", () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

import { directChatService } from "./directChatService";

describe("directChatService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads the inbox", async () => {
    mockGet.mockResolvedValue({ data: { items: [], up: null, unread_count: 0 } });
    const data = await directChatService.inbox();
    expect(mockGet).toHaveBeenCalledWith("/direct-chats");
    expect(data.unread_count).toBe(0);
  });

  it("opens the employee thread", async () => {
    mockPost.mockResolvedValue({
      data: { conversation: { id: "c1" }, messages: [], peer: null },
    });
    const opened = await directChatService.openMine();
    expect(mockPost).toHaveBeenCalledWith("/direct-chats/mine");
    expect(opened.conversation.id).toBe("c1");
  });

  it("opens the network manager thread when asked", async () => {
    mockPost.mockResolvedValue({
      data: { conversation: { id: "cn" }, messages: [], peer: null },
    });
    const opened = await directChatService.openMine("network");
    expect(mockPost).toHaveBeenCalledWith("/direct-chats/mine", undefined, { params: { scope: "network" } });
    expect(opened.conversation.id).toBe("cn");
  });
});
