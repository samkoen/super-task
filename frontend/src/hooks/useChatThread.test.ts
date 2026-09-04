import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { he } from "../i18n/he";
import type { ChatTransport } from "../utils/chatTransport";
import { useChatThread } from "./useChatThread";

function fakeTransport(overrides: Partial<ChatTransport> = {}): ChatTransport {
  return {
    list: vi.fn().mockResolvedValue({ messages: [], has_more: false }),
    send: vi.fn().mockResolvedValue({}),
    upload: vi.fn().mockResolvedValue({ photo_url: "/p.jpg" }),
    ...overrides,
  };
}

describe("useChatThread", () => {
  it("refuses an empty text send", async () => {
    const transport = fakeTransport();
    const { result } = renderHook(() => useChatThread({ transport, enabled: true }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.sendText();
    });
    expect(result.current.error).toBe(he.taskChatNeedContent);
    expect(transport.send).not.toHaveBeenCalled();
  });

  it("sends text then reloads the latest page", async () => {
    const transport = fakeTransport({
      send: vi.fn().mockResolvedValue({}),
    });
    const { result } = renderHook(() => useChatThread({ transport, enabled: true }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setBody("  שלום  "));
    await act(async () => {
      await result.current.sendText();
    });
    expect(transport.send).toHaveBeenCalledWith({ body: "שלום" });
    expect(transport.list).toHaveBeenCalledTimes(2);
    expect(result.current.body).toBe("");
  });

  it("uploads media then posts the returned url", async () => {
    const transport = fakeTransport();
    const { result } = renderHook(() => useChatThread({ transport, enabled: true }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const file = new File(["x"], "p.jpg", { type: "image/jpeg" });
    await act(async () => {
      await result.current.sendMedia(file, "photo");
    });
    expect(transport.upload).toHaveBeenCalledWith(file, "photo");
    expect(transport.send).toHaveBeenCalledWith({ photo_url: "/p.jpg" });
  });

  it("uploads a file then posts url and name", async () => {
    const transport = fakeTransport({
      upload: vi.fn().mockResolvedValue({ file_url: "/f.pdf", file_name: "a.pdf" }),
    });
    const { result } = renderHook(() => useChatThread({ transport, enabled: true }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const file = new File(["x"], "a.pdf", { type: "application/pdf" });
    await act(async () => {
      await result.current.sendMedia(file, "file");
    });
    expect(transport.upload).toHaveBeenCalledWith(file, "file");
    expect(transport.send).toHaveBeenCalledWith({ file_url: "/f.pdf", file_name: "a.pdf" });
  });
});
