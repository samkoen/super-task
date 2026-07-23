import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import TaskChatPanel from "./TaskChatPanel";
import { he } from "../../i18n/he";
import { TASK_CHANGE_EVENT } from "../../constants/events";
import { taskService } from "../../services/taskService";

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "emp-1", role: "employee", full_name: "עובד" } }),
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

vi.mock("../../utils/mediaUrl", () => ({
  mediaUrl: (p: string | null) => p,
}));

vi.mock("../media/MediaCaptureActions", () => ({
  default: () => null,
}));

beforeEach(() => {
  vi.mocked(taskService.listMessages).mockReset();
  vi.mocked(taskService.postMessage).mockReset();
  vi.mocked(taskService.uploadPhoto).mockReset();
});

describe("TaskChatPanel", () => {
  it("shows text and photo from both participants", async () => {
    vi.mocked(taskService.listMessages).mockResolvedValue([
      {
        id: "m1",
        occurrence_id: "occ-1",
        sender_user_id: "emp-1",
        sender_role: "employee",
        sender_name: "עובד",
        body: "שאלה שלי",
        display_body: "שאלה שלי",
        photo_url: "/uploads/chat/a.jpg",
        video_url: null,
        audio_url: null,
        created_at: "2026-07-22T10:00:00.000Z",
      },
      {
        id: "m2",
        occurrence_id: "occ-1",
        sender_user_id: "mgr-1",
        sender_role: "branch_manager",
        sender_name: "מנהל",
        body: "תשובה",
        display_body: "תשובה",
        photo_url: null,
        video_url: null,
        audio_url: null,
        created_at: "2026-07-22T10:05:00.000Z",
      },
    ]);

    render(<TaskChatPanel occurrenceId="occ-1" pollMs={false} />);

    await waitFor(() => {
      expect(screen.getByText("שאלה שלי")).toBeTruthy();
      expect(screen.getByText("תשובה")).toBeTruthy();
    });
    expect(screen.getByAltText(he.taskReferencePhoto)).toBeTruthy();
  });

  it("reloads the thread when a chat SSE event arrives", async () => {
    vi.mocked(taskService.listMessages)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "m2",
          occurrence_id: "occ-1",
          sender_user_id: "mgr-1",
          sender_role: "branch_manager",
          sender_name: "מנהל",
          body: "תשובת מנהל",
          display_body: "תשובת מנהל",
          photo_url: null,
          video_url: null,
          audio_url: null,
          created_at: "2026-07-22T10:05:00.000Z",
        },
      ]);

    render(<TaskChatPanel occurrenceId="occ-1" pollMs={false} />);
    await waitFor(() => expect(screen.getByText(he.taskChatEmpty)).toBeTruthy());

    window.dispatchEvent(
      new CustomEvent(TASK_CHANGE_EVENT, {
        detail: { type: "task_message_manager", occurrence_id: "occ-1" },
      }),
    );

    await waitFor(() => {
      expect(screen.getByText("תשובת מנהל")).toBeTruthy();
      expect(taskService.listMessages).toHaveBeenCalledTimes(2);
    });
  });

  it("posts text then reloads thread so both sides see the message", async () => {
    vi.mocked(taskService.listMessages)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "m3",
          occurrence_id: "occ-1",
          sender_user_id: "emp-1",
          sender_role: "employee",
          sender_name: "עובד",
          body: "הנה",
          display_body: "הנה",
          photo_url: null,
          video_url: null,
          audio_url: null,
          created_at: "2026-07-22T11:00:00.000Z",
        },
      ]);
    vi.mocked(taskService.postMessage).mockResolvedValue({
      chat_message: {
        id: "m3",
        occurrence_id: "occ-1",
        sender_user_id: "emp-1",
        body: "הנה",
        created_at: "2026-07-22T11:00:00.000Z",
      },
      occurrence: { id: "occ-1", status: "awaiting_response" },
    } as never);

    const onUpdated = vi.fn();
    render(
      <TaskChatPanel occurrenceId="occ-1" onOccurrenceUpdated={onUpdated} pollMs={false} />,
    );
    await waitFor(() => expect(screen.getByText(he.taskChatEmpty)).toBeTruthy());

    fireEvent.change(screen.getByPlaceholderText(he.taskChatPlaceholder), {
      target: { value: "הנה" },
    });
    fireEvent.click(screen.getByText(he.taskChatSend));

    await waitFor(() => {
      expect(taskService.postMessage).toHaveBeenCalledWith("occ-1", {
        body: "הנה",
        photo_url: undefined,
        video_url: undefined,
        audio_url: undefined,
      });
      expect(screen.getByText("הנה")).toBeTruthy();
      expect(onUpdated).toHaveBeenCalledWith("awaiting_response");
    });
    expect(taskService.listMessages).toHaveBeenCalledTimes(2);
  });
});
