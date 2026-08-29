import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import TaskChatPanel from "./TaskChatPanel";
import { he } from "../../i18n/he";
import { taskService } from "../../services/taskService";
import { formatTime } from "../../utils/dashboardTime";

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "m1", role: "branch_manager", full_name: "מנהל" } }),
}));

vi.mock("../../services/taskService", () => ({
  taskService: {
    listMessages: vi.fn(),
    postMessage: vi.fn(),
    uploadPhoto: vi.fn(),
    uploadVideo: vi.fn(),
    uploadAudio: vi.fn(),
  },
}));

vi.mock("../../utils/mediaUrl", () => ({ mediaUrl: (p: string | null) => p }));
vi.mock("../media/MediaCaptureActions", () => ({ default: () => null }));
vi.mock("../chat/ChatComposerBar", async () => {
  const { he } = await import("../../i18n/he");
  return {
    default: (props: {
      body: string;
      onBodyChange: (value: string) => void;
      onSendText: () => void;
    }) => (
      <>
        <input
          placeholder={he.taskChatPlaceholder}
          value={props.body}
          onChange={(e) => props.onBodyChange(e.target.value)}
        />
        <button type="button" onClick={props.onSendText}>
          {he.taskChatSend}
        </button>
      </>
    ),
  };
});

describe("TaskChatPanel break alert", () => {
  beforeEach(() => {
    vi.mocked(taskService.listMessages).mockReset();
    vi.mocked(taskService.postMessage).mockReset();
  });

  it("asks the manager whether to ring when the assignee is on break", async () => {
    vi.mocked(taskService.listMessages).mockResolvedValue({ messages: [], has_more: false });
    vi.mocked(taskService.postMessage).mockResolvedValue({
      chat_message: {
        id: "m3",
        occurrence_id: "occ-1",
        sender_user_id: "m1",
        body: "דחוף",
        created_at: "2026-08-28T11:00:00.000Z",
      },
      occurrence: { id: "occ-1", status: "in_progress" },
      recipient_user_id: "emp-1",
      recipient_break: {
        on_break: true,
        on_break_since: "2026-08-28T10:00:00+03:00",
        elapsed_seconds: 600,
      },
    } as never);
    render(<TaskChatPanel occurrenceId="occ-1" pollMs={false} />);
    await screen.findByText(he.taskChatEmpty);
    fireEvent.change(screen.getByPlaceholderText(he.taskChatPlaceholder), {
      target: { value: "דחוף" },
    });
    fireEvent.click(screen.getByText(he.taskChatSend));
    expect(await screen.findByText(he.breakAlertTitle)).toBeTruthy();
    expect(screen.getByText(he.breakAlertSince(formatTime("2026-08-28T10:00:00+03:00")))).toBeTruthy();
  });
});
