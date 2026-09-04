import { beforeEach, describe, expect, it, vi } from "vitest";
import { directChatService } from "../services/directChatService";
import { createDirectChatTransport } from "./directChatTransport";

vi.mock("../services/directChatService", () => ({
  directChatService: {
    listMessages: vi.fn(),
    send: vi.fn(),
    broadcast: vi.fn(),
    uploadPhoto: vi.fn(),
    uploadVideo: vi.fn(),
    uploadAudio: vi.fn(),
    uploadFile: vi.fn(),
  },
}));

describe("directChatTransport", () => {
  beforeEach(() => {
    vi.mocked(directChatService.listMessages).mockReset();
    vi.mocked(directChatService.send).mockReset();
    vi.mocked(directChatService.broadcast).mockReset();
  });

  it("lists an empty page without a conversation", async () => {
    const transport = createDirectChatTransport({ conversationId: null });
    await expect(transport.list()).resolves.toEqual({ messages: [], has_more: false });
    expect(directChatService.listMessages).not.toHaveBeenCalled();
  });

  it("sends into the conversation and exposes the break payload", async () => {
    vi.mocked(directChatService.send).mockResolvedValue({ recipient_user_id: "e1" });
    const onSent = vi.fn();
    const transport = createDirectChatTransport({ conversationId: "c1", onSent });
    const result = await transport.send({ body: "שלום" });
    expect(directChatService.send).toHaveBeenCalledWith("c1", { body: "שלום" });
    expect(onSent).toHaveBeenCalled();
    expect(result.breakFrom).toEqual({ recipient_user_id: "e1" });
  });

  it("broadcasts without opening a thread", async () => {
    vi.mocked(directChatService.broadcast).mockResolvedValue({ ok: true, count: 2 });
    const onSent = vi.fn();
    const transport = createDirectChatTransport({ conversationId: null, broadcast: true, onSent });
    await expect(transport.send({ body: "לכולם" })).resolves.toEqual({});
    expect(directChatService.broadcast).toHaveBeenCalledWith({ body: "לכולם" });
    expect(directChatService.send).not.toHaveBeenCalled();
    expect(onSent).toHaveBeenCalled();
  });
});
