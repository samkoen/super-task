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
    resolveChatTask: vi.fn(),
    setChatFollowUp: vi.fn(),
  },
}));

vi.mock("../../utils/mediaUrl", () => ({
  mediaUrl: (p: string | null) => p,
}));

vi.mock("../media/MediaCaptureActions", () => ({
  default: () => null,
}));

vi.mock("../chat/ChatComposerBar", async () => {
  const { he } = await import("../../i18n/he");
  return {
    default: (props: {
      body: string;
      onBodyChange: (value: string) => void;
      onSendText: () => void;
      onSendMedia: (file: File, kind: "photo" | "video" | "audio") => void;
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
        <button
          type="button"
          onClick={() =>
            props.onSendMedia(new File(["x"], "a.jpg", { type: "image/jpeg" }), "photo")
          }
        >
          send-photo
        </button>
      </>
    ),
  };
});

beforeEach(() => {
  vi.mocked(taskService.listMessages).mockReset();
  vi.mocked(taskService.postMessage).mockReset();
  vi.mocked(taskService.uploadPhoto).mockReset();
  vi.mocked(taskService.resolveChatTask).mockReset();
});

describe("TaskChatPanel", () => {
  it("shows text and photo from both participants", async () => {
    vi.mocked(taskService.listMessages).mockResolvedValue({
      has_more: false,
      messages: [
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
    ],
    });

    render(<TaskChatPanel occurrenceId="occ-1" pollMs={false} />);

    await waitFor(() => {
      expect(screen.getByText("שאלה שלי")).toBeTruthy();
      expect(screen.getByText("תשובה")).toBeTruthy();
    });
    expect(screen.getByAltText(he.taskReferencePhoto)).toBeTruthy();
  });

  it("shows received audio as a full-width line, not a square", async () => {
    vi.mocked(taskService.listMessages).mockResolvedValue({
      has_more: false,
      messages: [
        {
          id: "m-audio",
          occurrence_id: "occ-1",
          sender_user_id: "mgr-1",
          sender_role: "branch_manager",
          sender_name: "מנהל",
          body: "",
          display_body: "",
          photo_url: null,
          video_url: null,
          audio_url: "/uploads/chat/v.webm",
          created_at: "2026-07-22T10:05:00.000Z",
        },
      ],
    });
    render(<TaskChatPanel occurrenceId="occ-1" pollMs={false} />);
    await waitFor(() => {
      expect(screen.getByTestId("compact-audio-player")).toBeTruthy();
    });
    expect(screen.queryByText(he.completionMediaAdded)).toBeNull();
    expect(document.querySelector("audio")).toBeNull();
  });

  it("reloads the thread when a chat SSE event arrives", async () => {
    vi.mocked(taskService.listMessages)
      .mockResolvedValueOnce({ messages: [], has_more: false })
      .mockResolvedValueOnce({
        has_more: false,
        messages: [
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
        ],
      });

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
      .mockResolvedValueOnce({ messages: [], has_more: false })
      .mockResolvedValueOnce({
        has_more: false,
        messages: [
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
        ],
      });
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
      });
      expect(screen.getByText("הנה")).toBeTruthy();
      expect(onUpdated).toHaveBeenCalledWith("awaiting_response", he.taskChatSent);
    });
    expect(taskService.listMessages).toHaveBeenCalledTimes(2);
  });

  it("prepends older task messages on demand", async () => {
    vi.mocked(taskService.listMessages)
      .mockResolvedValueOnce({
        has_more: true,
        messages: [
          {
            id: "m2",
            occurrence_id: "occ-1",
            sender_user_id: "emp-1",
            sender_role: "employee",
            sender_name: "עובד",
            body: "חדש",
            display_body: "חדש",
            photo_url: null,
            video_url: null,
            audio_url: null,
            created_at: "2026-07-22T10:05:00.000Z",
          },
        ],
      })
      .mockResolvedValueOnce({
        has_more: false,
        messages: [
          {
            id: "m1",
            occurrence_id: "occ-1",
            sender_user_id: "emp-1",
            sender_role: "employee",
            sender_name: "עובד",
            body: "ישן",
            display_body: "ישן",
            photo_url: null,
            video_url: null,
            audio_url: null,
            created_at: "2026-07-22T10:00:00.000Z",
          },
        ],
      });
    render(<TaskChatPanel occurrenceId="occ-1" pollMs={false} />);
    await waitFor(() => expect(screen.getByText("חדש")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: he.chatLoadOlder }));
    await waitFor(() => expect(screen.getByText("ישן")).toBeTruthy());
    expect(taskService.listMessages).toHaveBeenLastCalledWith("occ-1", { before: "m2" });
    expect(taskService.resolveChatTask).not.toHaveBeenCalled();
  });

  it("lets the employee annotate a received photo and send it back", async () => {
    vi.mocked(taskService.listMessages).mockResolvedValue({
      has_more: false,
      messages: [
        {
          id: "m-photo",
          occurrence_id: "occ-1",
          sender_user_id: "mgr-1",
          sender_role: "branch_manager",
          sender_name: "מנהל",
          body: "",
          display_body: "",
          photo_url: "/uploads/chat/from-mgr.jpg",
          video_url: null,
          audio_url: null,
          created_at: "2026-07-22T10:05:00.000Z",
        },
        {
          id: "m-mine",
          occurrence_id: "occ-1",
          sender_user_id: "emp-1",
          sender_role: "employee",
          sender_name: "עובד",
          body: "",
          display_body: "",
          photo_url: "/uploads/chat/mine.jpg",
          video_url: null,
          audio_url: null,
          created_at: "2026-07-22T10:06:00.000Z",
        },
      ],
    });
    render(<TaskChatPanel occurrenceId="occ-1" pollMs={false} />);
    await waitFor(() => {
      expect(screen.getAllByAltText(he.taskReferencePhoto)).toHaveLength(2);
    });
    expect(screen.getAllByRole("button", { name: he.chatAnnotateReply })).toHaveLength(1);
  });

  it("uploads a photo and posts it immediately", async () => {
    vi.mocked(taskService.listMessages).mockResolvedValue({ messages: [], has_more: false });
    vi.mocked(taskService.uploadPhoto).mockResolvedValue({ url: "/uploads/p.jpg" } as never);
    vi.mocked(taskService.postMessage).mockResolvedValue({
      occurrence: { id: "occ-1", status: "awaiting_response" },
    } as never);

    render(<TaskChatPanel occurrenceId="occ-1" pollMs={false} />);
    await waitFor(() => expect(screen.getByText(he.taskChatEmpty)).toBeTruthy());
    fireEvent.click(screen.getByText("send-photo"));

    await waitFor(() => {
      expect(taskService.uploadPhoto).toHaveBeenCalled();
      expect(taskService.postMessage).toHaveBeenCalledWith("occ-1", {
        photo_url: "/uploads/p.jpg",
      });
    });
  });
});
