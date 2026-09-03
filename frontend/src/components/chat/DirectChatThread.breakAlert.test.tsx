import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import DirectChatThread from "./DirectChatThread";
import { he } from "../../i18n/he";
import { directChatService } from "../../services/directChatService";
import { formatTime } from "../../utils/dashboardTime";

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "m1", role: "branch_manager", full_name: "מנהל" } }),
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
vi.mock("./ChatComposerBar", async () => {
  const { he: labels } = await import("../../i18n/he");
  return {
    default: (props: {
      body: string;
      placeholder?: string;
      sendLabel?: string;
      onBodyChange: (value: string) => void;
      onSendText: () => void;
    }) => (
      <>
        <input
          placeholder={props.placeholder ?? labels.taskChatPlaceholder}
          value={props.body}
          onChange={(e) => props.onBodyChange(e.target.value)}
        />
        <button type="button" onClick={props.onSendText}>
          {props.sendLabel ?? labels.taskChatSend}
        </button>
      </>
    ),
  };
});

describe("DirectChatThread break alert", () => {
  beforeEach(() => {
    vi.mocked(directChatService.listMessages).mockReset();
    vi.mocked(directChatService.send).mockReset();
  });

  it("asks the manager whether to ring when the oved is on break", async () => {
    vi.mocked(directChatService.listMessages).mockResolvedValue({ messages: [], has_more: false });
    vi.mocked(directChatService.send).mockResolvedValue({
      recipient_user_id: "e1",
      recipient_break: {
        on_break: true,
        on_break_since: "2026-08-28T10:00:00+03:00",
        elapsed_seconds: 120,
      },
    });
    render(<DirectChatThread conversationId="c1" />);
    fireEvent.change(screen.getByPlaceholderText(he.directChatPlaceholder), {
      target: { value: "דחוף" },
    });
    fireEvent.click(screen.getByText(he.taskChatSend));
    expect(await screen.findByText(he.breakAlertTitle)).toBeTruthy();
    expect(screen.getByText(he.breakAlertSince(formatTime("2026-08-28T10:00:00+03:00")))).toBeTruthy();
    await waitFor(() => {
      expect(directChatService.send).toHaveBeenCalled();
    });
  });
});
