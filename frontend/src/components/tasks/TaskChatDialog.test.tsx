import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import TaskChatDialog, { OpenTaskChatButton } from "./TaskChatDialog";
import { he } from "../../i18n/he";
import { taskService } from "../../services/taskService";

vi.mock("../../hooks/useResolvedMediaSrc", () => ({
  useResolvedMediaSrc: (path: string | null) => ({
    src: path,
    loading: false,
    failed: false,
    onError: () => {},
  }),
}));

vi.mock("./TaskChatPanel", () => ({
  default: ({ occurrenceId }: { occurrenceId: string }) => <div>task-thread:{occurrenceId}</div>,
}));

vi.mock("../../services/taskService", () => ({
  taskService: { getOccurrence: vi.fn() },
}));

describe("TaskChatDialog", () => {
  beforeEach(() => {
    vi.mocked(taskService.getOccurrence).mockReset();
  });

  it("shows the task photos and videos above the thread", async () => {
    vi.mocked(taskService.getOccurrence).mockResolvedValue({
      id: "occ-1",
      completion: {
        id: "c1",
        occurrence_id: "occ-1",
        status: "completed",
        note: null,
        photo_path: "/p.jpg",
        video_path: "/v.mp4",
        audio_path: "/a.webm",
        not_completed_reason: null,
        completed_by_id: "u1",
        completed_at: "2026-08-25T12:00:00+03:00",
      },
    } as never);
    render(
      <TaskChatDialog
        open
        occurrenceId="occ-1"
        title="צילום מדף"
        status="pending_review"
        employee={false}
        onClose={vi.fn()}
      />,
    );
    expect(await screen.findByText("task-thread:occ-1")).toBeTruthy();
    await waitFor(() => expect(document.querySelector("img[src='/p.jpg']")).toBeTruthy());
    expect(document.querySelector("video[src='/v.mp4']")).toBeTruthy();
    expect(screen.queryByText(he.taskReferenceAudio)).toBeNull();
    expect(document.querySelector("audio")).toBeNull();
  });

  it("opens the same chat from the task button without a thread until then", () => {
    render(
      <OpenTaskChatButton
        occurrenceId="occ-1"
        title="צילום מדף"
        status="in_progress"
        employee
        completion={null}
      />,
    );
    expect(screen.queryByText("task-thread:occ-1")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: he.taskChatSection }));
    expect(screen.getByText("task-thread:occ-1")).toBeTruthy();
    expect(taskService.getOccurrence).not.toHaveBeenCalled();
  });
});
