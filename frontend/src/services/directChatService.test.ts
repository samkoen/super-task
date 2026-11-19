import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock("./api", () => ({
  EMPTY_JSON_BODY: {},
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

import {
  directChatService,
  INBOX_CACHE_MS,
  invalidateDirectChatInbox,
  resetDirectChatInboxCache,
} from "./directChatService";

describe("directChatService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    resetDirectChatInboxCache();
  });

  it("shares one inbox request between concurrent callers", async () => {
    mockGet.mockResolvedValue({ data: { items: [], up: null, unread_count: 2 } });
    const [a, b, c] = await Promise.all([
      directChatService.inbox(),
      directChatService.inbox(),
      directChatService.inbox(),
    ]);
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect([a.unread_count, b.unread_count, c.unread_count]).toEqual([2, 2, 2]);
  });

  it("reuses the inbox briefly, then refetches", async () => {
    vi.useFakeTimers();
    mockGet.mockResolvedValue({ data: { items: [], up: null, unread_count: 0 } });
    await directChatService.inbox();
    await directChatService.inbox();
    expect(mockGet).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(INBOX_CACHE_MS + 1);
    await directChatService.inbox();
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it("refetches after invalidation (send, read, SSE)", async () => {
    mockGet.mockResolvedValue({ data: { items: [], up: null, unread_count: 0 } });
    mockPost.mockResolvedValue({ data: {} });
    await directChatService.inbox();
    await directChatService.send("c1", { body: "x" });
    await directChatService.inbox();
    invalidateDirectChatInbox();
    await directChatService.inbox();
    expect(mockGet).toHaveBeenCalledTimes(3);
  });

  it("serves the last inbox instead of hammering after a 429", async () => {
    vi.useFakeTimers();
    mockGet.mockResolvedValueOnce({ data: { items: [], up: null, unread_count: 5 } });
    await directChatService.inbox();
    vi.advanceTimersByTime(INBOX_CACHE_MS + 1);
    mockGet.mockRejectedValueOnce(Object.assign(new Error("slow down"), { status: 429 }));
    expect((await directChatService.inbox()).unread_count).toBe(5);
    vi.advanceTimersByTime(INBOX_CACHE_MS + 1);
    expect((await directChatService.inbox()).unread_count).toBe(5);
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

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
    expect(mockPost).toHaveBeenCalledWith("/direct-chats/mine", {});
    expect(opened.conversation.id).toBe("c1");
  });

  it("opens the network manager thread when asked", async () => {
    mockPost.mockResolvedValue({
      data: { conversation: { id: "cn" }, messages: [], peer: null },
    });
    const opened = await directChatService.openMine("network");
    expect(mockPost).toHaveBeenCalledWith("/direct-chats/mine", {}, { params: { scope: "network" } });
    expect(opened.conversation.id).toBe("cn");
  });
});
