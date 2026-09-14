import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import TaskOccurrenceEditDialog from "./TaskOccurrenceEditDialog";
import { he } from "../../i18n/he";
import { taskService, type TaskOccurrence } from "../../services/taskService";

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "m1", role: "branch_manager", branch_id: "b1" } }),
}));

vi.mock("../../context/FeedbackContext", () => {
  const showError = vi.fn();
  const showSuccess = vi.fn();
  return { useFeedback: () => ({ showError, showSuccess }) };
});

vi.mock("../../utils/mediaUrl", () => ({
  mediaUrl: (path: string | null) => path,
}));

vi.mock("./TaskChatPanel", () => ({
  default: () => <div data-testid="task-chat-panel">{he.taskChatTitle}</div>,
}));

vi.mock("./CompletionRequirementsEditor", () => ({
  default: () => null,
}));

vi.mock("./TaskReferenceMediaEditor", () => ({
  default: ({
    value,
  }: {
    value: {
      reference_photo_url: string;
      reference_video_url: string;
      reference_audio_url: string;
    };
  }) => (
    <div>
      {value.reference_photo_url ? <img alt="ref-photo" src={value.reference_photo_url} /> : null}
      {value.reference_video_url ? <video src={value.reference_video_url} /> : null}
      {value.reference_audio_url ? <audio src={value.reference_audio_url} /> : null}
    </div>
  ),
}));

vi.mock("../../services/taskService", () => ({
  taskService: { getOccurrence: vi.fn(), updateOccurrence: vi.fn() },
}));

vi.mock("../../services/userService", () => ({
  userService: { listTeam: vi.fn().mockResolvedValue([]) },
}));

vi.mock("../../utils/fetchMediaBlob", () => ({
  fetchMediaBlobWithRetry: vi.fn().mockRejectedValue(new Error("no fetch in tests")),
  fetchMediaBlob: vi.fn().mockRejectedValue(new Error("no fetch in tests")),
}));

function occurrence(): TaskOccurrence {
  return {
    id: "occ-1",
    template_id: null,
    branch_id: "b1",
    title: "צילום מדף",
    description: "",
    due_at: "2026-08-25T18:00:00+03:00",
    status: "completed",
    assignee_user_id: "u1",
    department_id: null,
    task_kind: "ad_hoc",
    manager_user_id: "m1",
    photo_required: true,
    started_at: "2026-08-25T10:00:00+03:00",
    created_at: "2026-08-25T08:00:00+03:00",
    updated_at: "2026-08-25T12:00:00+03:00",
    reference_photo_url: "/ref.jpg",
    reference_video_url: "/ref.mp4",
    reference_audio_url: "/ref.webm",
    completion: {
      id: "c1",
      occurrence_id: "occ-1",
      status: "completed",
      note: "בוצע",
      photo_path: "/p.jpg",
      video_path: "/v.mp4",
      audio_path: "/a.webm",
      not_completed_reason: null,
      completed_by_id: "u1",
      completed_at: "2026-08-25T12:00:00+03:00",
      manager_review_status: "approved",
    },
  };
}

describe("TaskOccurrenceEditDialog", () => {
  beforeEach(() => {
    vi.mocked(taskService.getOccurrence).mockResolvedValue(occurrence());
  });

  it("shows reference and submitted photo, video and audio when the menahel opens a task", async () => {
    render(<TaskOccurrenceEditDialog occurrenceId="occ-1" employees={[]} onClose={vi.fn()} />);
    expect(await screen.findByText(he.completionMediaFromEmployee)).toBeTruthy();
    expect(document.querySelector("img[src='/ref.jpg']")).toBeTruthy();
    expect(document.querySelector("video[src='/ref.mp4']")).toBeTruthy();
    expect(document.querySelector("audio[src='/ref.webm']")).toBeTruthy();
    expect(document.querySelector("img[src='/p.jpg']")).toBeTruthy();
    expect(document.querySelector("video[src='/v.mp4']")).toBeTruthy();
    expect(screen.getByTestId("compact-audio-player")).toBeTruthy();
  });

  it("hides submitted media when the occurrence has none", async () => {
    vi.mocked(taskService.getOccurrence).mockResolvedValue({
      ...occurrence(),
      completion: null,
      reference_photo_url: null,
      reference_video_url: null,
      reference_audio_url: null,
    });
    render(<TaskOccurrenceEditDialog occurrenceId="occ-1" employees={[]} onClose={vi.fn()} />);
    expect(await screen.findByText(he.editTask)).toBeTruthy();
    expect(screen.queryByText(he.completionMediaFromEmployee)).toBeNull();
    expect(screen.queryByTestId("compact-audio-player")).toBeNull();
  });
});
