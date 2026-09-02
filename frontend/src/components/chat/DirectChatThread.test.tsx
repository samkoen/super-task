import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import DirectChatThread from "./DirectChatThread";
import { he } from "../../i18n/he";
import { directChatService } from "../../services/directChatService";

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "emp-1", role: "employee", full_name: "עובד" } }),
}));

vi.mock("../../services/directChatService", () => ({
  directChatService: {
    listMessages: vi.fn(),
    send: vi.fn(),
    broadcast: vi.fn(),
    uploadPhoto: vi.fn(),
    uploadVideo: vi.fn(),
    uploadAudio: vi.fn(),
  },
}));

vi.mock("../../hooks/useDirectChatLiveSync", () => ({
  useDirectChatLiveSync: () => undefined,
}));

vi.mock("../../utils/mediaUrl", () => ({ mediaUrl: (p: string | null) => p }));
vi.mock("../media/MediaCaptureActions", () => ({ default: () => null }));

function msg(id: string, body: string) {
  return {
    id,
    conversation_id: "c1",
    sender_user_id: "emp-1",
    sender_name: "עובד",
    body,
    photo_url: null,
    video_url: null,
    audio_url: null,
    created_at: "2026-08-26T08:00:00+03:00",
  };
}

describe("DirectChatThread", () => {
  beforeEach(() => {
    vi.mocked(directChatService.listMessages).mockReset();
    vi.mocked(directChatService.send).mockReset();
  });

  it("shows an empty thread then sends text", async () => {
    vi.mocked(directChatService.listMessages).mockResolvedValue({ messages: [], has_more: false });
    vi.mocked(directChatService.send).mockResolvedValue({});
    render(<DirectChatThread conversationId="c1" />);
    await waitFor(() => expect(screen.getByText(he.directChatEmpty)).toBeTruthy());
    fireEvent.change(screen.getByPlaceholderText(he.directChatPlaceholder), {
      target: { value: "שלום מנהל" },
    });
    fireEvent.click(screen.getByText(he.taskChatSend));
    await waitFor(() => {
      expect(directChatService.send).toHaveBeenCalledWith("c1", expect.objectContaining({ body: "שלום מנהל" }));
    });
  });

  it("loads only the latest page then prepends older messages", async () => {
    vi.mocked(directChatService.listMessages)
      .mockResolvedValueOnce({ messages: [msg("m2", "חדש")], has_more: true })
      .mockResolvedValueOnce({ messages: [msg("m1", "ישן")], has_more: false });
    render(<DirectChatThread conversationId="c1" />);
    await waitFor(() => expect(screen.getByText("חדש")).toBeTruthy());
    expect(screen.queryByText("ישן")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: he.chatLoadOlder }));
    await waitFor(() => expect(screen.getByText("ישן")).toBeTruthy());
    expect(directChatService.listMessages).toHaveBeenLastCalledWith("c1", { before: "m2" });
  });

  it("shows received audio as a full-width line, not a square", async () => {
    vi.mocked(directChatService.listMessages).mockResolvedValue({
      messages: [{ ...msg("m-audio", ""), audio_url: "/uploads/chat/v.webm" }],
      has_more: false,
    });
    render(<DirectChatThread conversationId="c1" />);
    await waitFor(() => {
      expect(screen.getByTestId("compact-audio-player")).toBeTruthy();
    });
    expect(screen.queryByText(he.completionMediaAdded)).toBeNull();
    expect(document.querySelector("audio")).toBeNull();
  });
});
