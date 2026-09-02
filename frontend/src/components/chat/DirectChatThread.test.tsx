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
const audioMocks = vi.hoisted(() => ({
  stopAndWait: vi.fn(),
  reset: vi.fn(),
  start: vi.fn(),
}));

vi.mock("../../hooks/useAudioRecorder", () => ({
  useAudioRecorder: () => ({
    supported: true,
    recording: true,
    paused: false,
    blob: null,
    error: "",
    elapsedSeconds: 2,
    start: audioMocks.start,
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
    stopAndWait: audioMocks.stopAndWait,
    reset: audioMocks.reset,
  }),
}));

vi.mock("../media/MediaCaptureActions", () => ({
  default: ({
    onCapture,
    onAudioStart,
  }: {
    onCapture: (file: File, kind: "photo" | "video" | "audio") => void;
    onAudioStart?: () => void;
  }) => (
    <>
      <button
        type="button"
        onClick={() => onCapture(new File(["x"], "p.jpg", { type: "image/jpeg" }), "photo")}
      >
        add-photo
      </button>
      <button type="button" onClick={() => onAudioStart?.()}>
        add-audio
      </button>
    </>
  ),
}));

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
    vi.mocked(directChatService.uploadPhoto).mockReset();
    vi.mocked(directChatService.uploadAudio).mockReset();
    audioMocks.stopAndWait.mockReset();
    audioMocks.reset.mockReset();
    audioMocks.start.mockReset();
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

  it("sends a photo into the thread instead of attaching it below", async () => {
    vi.mocked(directChatService.listMessages).mockResolvedValue({ messages: [], has_more: false });
    vi.mocked(directChatService.uploadPhoto).mockResolvedValue({ url: "/uploads/p.jpg", kind: "photo" });
    vi.mocked(directChatService.send).mockResolvedValue({});
    render(<DirectChatThread conversationId="c1" />);
    fireEvent.click(await screen.findByRole("button", { name: "add-photo" }));
    await waitFor(() => {
      expect(directChatService.uploadPhoto).toHaveBeenCalled();
      expect(directChatService.send).toHaveBeenCalledWith("c1", { photo_url: "/uploads/p.jpg" });
    });
    expect(screen.queryByText(he.completionMediaAdded)).toBeNull();
  });

  it("closes the dock and shows an error when the recording is empty", async () => {
    vi.mocked(directChatService.listMessages).mockResolvedValue({ messages: [], has_more: false });
    audioMocks.stopAndWait.mockResolvedValue(null);
    render(<DirectChatThread conversationId="c1" />);
    fireEvent.click(await screen.findByRole("button", { name: "add-audio" }));
    fireEvent.click(screen.getByRole("button", { name: he.chatAudioSend }));
    await waitFor(() => expect(screen.getByText(he.chatAudioEmpty)).toBeTruthy());
    expect(audioMocks.reset).toHaveBeenCalled();
    expect(directChatService.uploadAudio).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: he.chatAudioSend })).toBeNull();
  });

  it("sends docked audio only once if the send button is tapped twice", async () => {
    vi.mocked(directChatService.listMessages).mockResolvedValue({ messages: [], has_more: false });
    let release: (blob: Blob) => void = () => undefined;
    audioMocks.stopAndWait.mockReturnValue(
      new Promise<Blob | null>((resolve) => {
        release = (blob) => resolve(blob);
      }),
    );
    vi.mocked(directChatService.uploadAudio).mockResolvedValue({ url: "/uploads/a.webm", kind: "audio" });
    vi.mocked(directChatService.send).mockResolvedValue({});
    render(<DirectChatThread conversationId="c1" />);
    fireEvent.click(await screen.findByRole("button", { name: "add-audio" }));
    const send = screen.getByRole("button", { name: he.chatAudioSend });
    fireEvent.click(send);
    fireEvent.click(send);
    expect(audioMocks.stopAndWait).toHaveBeenCalledTimes(1);
    release(new Blob(["x"], { type: "audio/webm" }));
    await waitFor(() => {
      expect(directChatService.uploadAudio).toHaveBeenCalledTimes(1);
    });
  });
});
