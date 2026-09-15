import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import TaskChatPanel from "./TaskChatPanel";
import { he } from "../../i18n/he";
import { taskService } from "../../services/taskService";

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
    uploadFile: vi.fn(),
    resolveChatTask: vi.fn(),
    setChatFollowUp: vi.fn(),
  },
}));

vi.mock("../../utils/mediaUrl", () => ({ mediaUrl: (p: string | null) => p }));
vi.mock("../chat/ChatComposerBar", () => ({ default: () => null }));

describe("TaskChatPanel manager chat task", () => {
  beforeEach(() => {
    vi.mocked(taskService.listMessages).mockReset();
    vi.mocked(taskService.resolveChatTask).mockReset();
    vi.mocked(taskService.listMessages).mockResolvedValue({ messages: [], has_more: false });
  });

  it("shows the oved message once in the thread, not as a duplicate banner", async () => {
    vi.mocked(taskService.listMessages).mockResolvedValue({
      has_more: false,
      messages: [
        {
          id: "m1",
          occurrence_id: "occ-1",
          sender_user_id: "emp-1",
          sender_role: "employee",
          sender_name: "עובד",
          body: "אהה",
          display_body: "אהה",
          photo_url: null,
          video_url: null,
          audio_url: null,
          created_at: "2026-07-22T10:00:00.000Z",
        },
      ],
    });
    render(
      <TaskChatPanel
        occurrenceId="occ-1"
        occurrenceStatus="awaiting_response"
        pollMs={false}
      />,
    );
    expect(await screen.findAllByText("אהה")).toHaveLength(1);
    expect(screen.queryByText(he.taskChatEmployeeQuestion)).toBeNull();
  });

  it("does not resolve the open task when the thread is only loaded", async () => {
    render(
      <TaskChatPanel
        occurrenceId="occ-1"
        occurrenceStatus="awaiting_response"
        pollMs={false}
      />,
    );
    expect(await screen.findByText(he.chatTaskComplete)).toBeTruthy();
    expect(taskService.resolveChatTask).not.toHaveBeenCalled();
  });

  it("archives the chat task when the manager completes it", async () => {
    vi.mocked(taskService.resolveChatTask).mockResolvedValue({
      occurrence: { id: "occ-1", status: "in_progress", chat_resolved_at: "2026-08-29T22:00:00+03:00" },
    } as never);
    const onUpdated = vi.fn();
    render(
      <TaskChatPanel
        occurrenceId="occ-1"
        occurrenceStatus="awaiting_response"
        onOccurrenceUpdated={onUpdated}
        pollMs={false}
      />,
    );
    fireEvent.click(await screen.findByRole("button", { name: he.chatTaskComplete }));
    await waitFor(() => {
      expect(taskService.resolveChatTask).toHaveBeenCalledWith("occ-1");
      expect(onUpdated).toHaveBeenCalledWith("in_progress", he.chatTaskCompleted);
    });
  });
});
