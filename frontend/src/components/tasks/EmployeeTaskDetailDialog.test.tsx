import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import EmployeeTaskDetailDialog from "./EmployeeTaskDetailDialog";
import { he } from "../../i18n/he";
import type { TaskStatus } from "../../services/taskService";
import type { EmployeeTaskCaptureProps } from "./EmployeeTaskDetailDialog";

vi.mock("../../services/deliveryNoteService", () => ({
  deliveryNoteService: {
    checkForOccurrence: vi.fn(async () => null),
    ordersForOccurrence: vi.fn(async () => {
      const { ApiError } = await import("../../services/api");
      throw new ApiError("אין הזמנות למשימה זו", 404);
    }),
  },
}));

vi.mock("./TaskChatPanel", () => ({
  default: ({ initialDraft }: { initialDraft?: string }) => (
    <div data-testid="task-chat-panel" data-draft={initialDraft ?? ""}>
      {he.taskChatTitle}
    </div>
  ),
}));

vi.mock("../../utils/mediaUrl", () => ({
  mediaUrl: (path: string | null) => path,
}));

vi.mock("../../hooks/useResolvedMediaSrc", () => ({
  useResolvedMediaSrc: (path: string | null) => ({
    src: path,
    loading: false,
    failed: false,
    onError: () => {},
  }),
}));

vi.mock("../../services/aiService", () => ({
  aiService: {
    getStatus: vi.fn(async () => ({ tts_available: false })),
    translateText: vi.fn(async (text: string) => text),
  },
}));

vi.mock("../media/MediaCaptureActions", () => ({
  default: ({
    photoLabel,
    videoLabel,
    audioLabel,
    photoDoneLabel,
    videoDoneLabel,
    photoAdded,
    videoAdded,
    allowedKinds,
    onCapture,
    trigger,
  }: {
    photoLabel?: string;
    videoLabel?: string;
    audioLabel?: string;
    photoDoneLabel?: string;
    videoDoneLabel?: string;
    photoAdded?: boolean;
    videoAdded?: boolean;
    allowedKinds?: string[];
    onCapture?: (file: File, kind: "photo" | "video" | "audio") => void;
    trigger?: (open: () => void, state: { disabled: boolean }) => ReactNode;
  }) => {
    const kinds = allowedKinds ?? ["photo", "video", "audio"];
    if (trigger) {
      const kind = kinds[0] as "photo" | "video" | "audio";
      return <>{trigger(() => onCapture?.(new File(["x"], `${kind}.bin`), kind), { disabled: false })}</>;
    }
    return (
      <div>
        {kinds.includes("photo") ? (
          <button type="button" onClick={() => onCapture?.(new File(["a"], "a.jpg"), "photo")}>
            {photoAdded ? photoDoneLabel ?? "photo-done" : photoLabel ?? he.addPhoto}
          </button>
        ) : null}
        {kinds.includes("video") ? (
          <button type="button" onClick={() => onCapture?.(new File(["v"], "v.webm"), "video")}>
            {videoAdded ? videoDoneLabel ?? "video-done" : videoLabel ?? he.addVideo}
          </button>
        ) : null}
        {kinds.includes("audio") ? (
          <button type="button" onClick={() => onCapture?.(new File(["s"], "s.webm"), "audio")}>
            {audioLabel ?? he.addAudio}
          </button>
        ) : null}
      </div>
    );
  },
}));

function task(status: TaskStatus = "pending") {
  return {
    id: "t1",
    title: "צילום מדף",
    description: "לצלם את המדף",
    status,
    due_at: "2026-08-19T23:59:00+03:00",
  };
}

/** Icônes d'une sous-tâche : celles de la tâche (en-tête) sont exclues. */
function slotHint(label: string) {
  const tools = screen.getByTestId("task-tools");
  return screen.getAllByLabelText(label).filter((el) => !tools.contains(el));
}

function capture(overrides: Partial<EmployeeTaskCaptureProps> = {}): EmployeeTaskCaptureProps {
  return {
    slots: [null],
    onSlotsChange: vi.fn(),
    note: "",
    onNoteChange: vi.fn(),
    onSubmit: vi.fn(),
    canSubmit: true,
    saving: false,
    ...overrides,
  };
}

describe("EmployeeTaskDetailDialog", () => {
  it("keeps a chat icon in the header and hides the thread until it is opened", () => {
    render(<EmployeeTaskDetailDialog task={task("in_progress")} onClose={vi.fn()} />);
    const chat = screen.getByRole("button", { name: he.taskChatSection });
    expect(screen.getByTestId("task-tools").contains(chat)).toBe(true);
    expect(screen.queryByTestId("task-chat-panel")).toBeNull();
    fireEvent.click(chat);
    expect(screen.getByTestId("task-chat-panel")).toBeTruthy();
  });

  it("opens the list-style chat when the task is already waiting on the manager", () => {
    render(
      <EmployeeTaskDetailDialog task={task()} chatFirst capture={capture()} onClose={vi.fn()} />,
    );
    expect(screen.getByTestId("task-chat-panel")).toBeTruthy();
  });

  it("offers to reopen the start url", () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(
      <EmployeeTaskDetailDialog
        task={{ ...task("in_progress"), start_url: "https://example.com/order" }}
        onClose={vi.fn()}
      />,
    );
    const buttons = screen.getAllByRole("button", { name: he.openStartUrl });
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0]);
    expect(click).toHaveBeenCalled();
    const a = click.mock.instances[0] as unknown as HTMLAnchorElement;
    expect(a.target).toBe("_blank");
    expect(a.href).toContain("https://example.com/order");
    click.mockRestore();
  });

  it("hides the reopen button when there is no start url", () => {
    render(<EmployeeTaskDetailDialog task={task("in_progress")} onClose={vi.fn()} />);
    expect(screen.queryByRole("button", { name: he.openStartUrl })).toBeNull();
  });

  it("shows the manager remark after a rejected review", () => {
    render(
      <EmployeeTaskDetailDialog
        task={{
          ...task("in_progress"),
          completion: {
            id: "c1",
            occurrence_id: "t1",
            status: "completed",
            note: null,
            photo_path: "/p.jpg",
            video_path: null,
            audio_path: null,
            not_completed_reason: null,
            completed_by_id: "u1",
            completed_at: "2026-08-25T12:00:00+03:00",
            manager_review_status: "rejected",
            rejection_note: "תקן את התמונה",
          },
        }}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(he.taskRejectedReopen)).toBeTruthy();
    expect(screen.getByText("תקן את התמונה")).toBeTruthy();
    expect(screen.queryByTestId("completion-outcome-done")).toBeNull();
    expect(screen.queryByTestId("completion-outcome-not-done")).toBeNull();
  });

  it("submits from the same dialog once the slots are filled", () => {
    const onSubmit = vi.fn();
    render(
      <EmployeeTaskDetailDialog
        task={task()}
        capture={capture({ onSubmit })}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: he.doTask }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("finishes with the single main button", () => {
    const onSubmit = vi.fn();
    render(
      <EmployeeTaskDetailDialog
        task={task("in_progress")}
        capture={capture({ onSubmit, note: "" })}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: he.markDone }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("shows hint icons from the slot title when no hint was written", () => {
    render(
      <EmployeeTaskDetailDialog
        task={{
          ...task(),
          completion_requirements: [{ kind: "photo", title: "מדף חלב", example_url: "/a.jpg" }],
        }}
        onClose={vi.fn()}
      />,
    );
    expect(slotHint(he.completionShowHint)).toHaveLength(1);
  });

  it("shows hint icons when the menahel wrote an explanation", () => {
    render(
      <EmployeeTaskDetailDialog
        task={{
          ...task(),
          completion_requirements: [
            { kind: "photo", title: "מדף חלב", hint: "לצלם את כל השורה", example_url: "/a.jpg" },
          ],
        }}
        onClose={vi.fn()}
      />,
    );
    expect(slotHint(he.completionShowHint)).toHaveLength(1);
  });

  it("shows hint icons on an audio slot", () => {
    render(
      <EmployeeTaskDetailDialog
        task={{
          ...task(),
          completion_requirements: [{ kind: "audio", title: "הקלטה", hint: "תאר מה שומעים" }],
        }}
        capture={capture()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("הקלטה")).toBeTruthy();
    expect(slotHint(he.completionShowHint)).toHaveLength(1);
    expect(slotHint(he.completionListenHint)).toHaveLength(1);
  });

  it("keeps the three previous videos when the oved opens a reopened task", () => {
    render(
      <EmployeeTaskDetailDialog
        task={{
          ...task("in_progress"),
          completion_requirements: [
            { kind: "video", title: "א", min_seconds: 10 },
            { kind: "video", title: "ב", min_seconds: 10 },
            { kind: "video", title: "ג", min_seconds: 10 },
          ],
        }}
        capture={capture({
          slots: [
            { file: null, previewUrl: "", keptUrl: "/uploads/v1.mp4", capturedAt: "", durationSeconds: 12 },
            { file: null, previewUrl: "", keptUrl: "/uploads/v2.mp4", capturedAt: "", durationSeconds: 11 },
            { file: null, previewUrl: "", keptUrl: "/uploads/v3.mp4", capturedAt: "", durationSeconds: 10 },
          ],
        })}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getAllByTestId("capture-step").map((el) => el.getAttribute("data-state"))).toEqual([
      "done",
      "done",
      "done",
    ]);
    expect(screen.getAllByRole("button", { name: he.completionRetake })).toHaveLength(3);
    expect(screen.queryByRole("button", { name: he.completionTakeVideo })).toBeNull();
  });

  it("shows capture buttons as soon as the oved opens a doable task", () => {
    render(
      <EmployeeTaskDetailDialog
        task={{
          ...task(),
          completion_requirements: [
            { kind: "photo", title: "מדף חלב", hint: "לצלם את כל השורה", example_url: "/a.jpg" },
          ],
        }}
        capture={capture()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: he.completionTakePhoto })).toBeTruthy();
    expect(slotHint(he.completionShowHint)).toHaveLength(1);
    expect(slotHint(he.completionListenHint)).toHaveLength(1);
  });

  it("shows all visual slots as soon as the oved opens the task", () => {
    render(
      <EmployeeTaskDetailDialog
        task={{
          ...task(),
          completion_requirements: [
            { kind: "photo", title: "מדף חלב", example_url: "/a.jpg" },
            { kind: "photo", title: "מקרר", example_url: "/b.jpg" },
            { kind: "video", title: "קופה", min_seconds: 10, example_url: "/c.jpg" },
            { kind: "video", title: "ניקיון", min_seconds: 10, example_url: "/d.jpg" },
          ],
        }}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(he.completionVisualSummary(2, 2))).toBeTruthy();
    expect(screen.getByText("מדף חלב")).toBeTruthy();
    expect(screen.getByText("מקרר")).toBeTruthy();
    expect(screen.getByText("קופה")).toBeTruthy();
    expect(screen.getByText("ניקיון")).toBeTruthy();
  });

  it("keeps the photo button while a chat reply is pending", () => {
    render(
      <EmployeeTaskDetailDialog
        task={{
          ...task("awaiting_response"),
          completion_requirements: [{ kind: "photo", title: "תעודה" }],
        }}
        capture={capture()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: he.completionTakePhoto })).toBeTruthy();
    expect(screen.getByRole("button", { name: he.markDone })).toBeTruthy();
  });

  it("shows only the required steps: no optional additions bar", () => {
    render(
      <EmployeeTaskDetailDialog
        task={{
          ...task("in_progress"),
          completion_requirements: [{ kind: "photo", title: "חלב" }],
        }}
        capture={capture()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: he.captureOptionalToggle })).toBeNull();
    expect(screen.queryByTestId("optional-capture-icons")).toBeNull();
    expect(screen.queryByRole("button", { name: he.addPhoto })).toBeNull();
    expect(screen.queryByRole("button", { name: he.addVideo })).toBeNull();
    expect(screen.queryByRole("button", { name: he.addAudio })).toBeNull();
    expect(screen.getByRole("button", { name: he.completionTakePhoto })).toBeTruthy();
  });

  it("lets the oved click send even when a photo is still missing", () => {
    render(
      <EmployeeTaskDetailDialog
        task={{
          ...task("in_progress"),
          completion_requirements: [
            { kind: "photo", title: "חלב" },
            { kind: "photo", title: "לחם" },
            { kind: "photo", title: "ביצים" },
          ],
        }}
        capture={capture({ canSubmit: true, slotsFilled: false, slots: [null, null, null] })}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("חלב")).toBeTruthy();
    expect(screen.getByText("לחם")).toBeTruthy();
    expect(screen.getByText("ביצים")).toBeTruthy();
    expect(screen.queryByText(he.completionFillSlotsHint)).toBeNull();
    expect((screen.getByRole("button", { name: he.markDone }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it("walks the oved through the steps: progress, next step and what is left", () => {
    render(
      <EmployeeTaskDetailDialog
        task={{
          ...task("in_progress"),
          completion_requirements: [
            { kind: "photo", title: "חלב" },
            { kind: "photo", title: "לחם" },
          ],
        }}
        capture={capture({
          slots: [{ file: null, previewUrl: "", keptUrl: "/a.jpg", capturedAt: "" }, null],
          slotsFilled: false,
        })}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(he.captureRemaining(1))).toBeTruthy();
    const states = screen.getAllByTestId("capture-step").map((el) => el.getAttribute("data-state"));
    expect(states).toEqual(["done", "next"]);
  });

  it("tells the oved everything is ready once the last step is done", () => {
    render(
      <EmployeeTaskDetailDialog
        task={{ ...task("in_progress"), completion_requirements: [{ kind: "photo", title: "חלב" }] }}
        capture={capture({
          slots: [{ file: null, previewUrl: "", keptUrl: "/a.jpg", capturedAt: "" }],
          slotsFilled: true,
        })}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(he.captureAllReady)).toBeTruthy();
  });

  it("puts the manager's rejection remark before the instructions", () => {
    render(
      <EmployeeTaskDetailDialog
        task={{
          ...task("in_progress"),
          completion: {
            id: "c1",
            occurrence_id: "t1",
            status: "completed",
            note: null,
            photo_path: "/p.jpg",
            video_path: null,
            audio_path: null,
            not_completed_reason: null,
            completed_by_id: "u1",
            completed_at: "2026-08-25T12:00:00+03:00",
            manager_review_status: "rejected",
            rejection_note: "תקן את התמונה",
          },
        }}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(he.taskRejectedReopen)).toBeTruthy();
    expect(screen.getByText("תקן את התמונה")).toBeTruthy();
    expect(screen.queryByText(he.taskWhatToDo)).toBeNull();
  });

  it("lets the oved read or listen to the task at any time", () => {
    render(<EmployeeTaskDetailDialog task={task("in_progress")} onClose={vi.fn()} />);
    expect(screen.getByTestId("task-tools").contains(screen.getByRole("button", { name: he.completionShowHint }))).toBe(true);
    expect(screen.getByTestId("task-tools").contains(screen.getByRole("button", { name: he.completionListenHint }))).toBe(true);
  });

  it("uses the same read, listen and question icons as the sub-tasks, on the status line", () => {
    render(<EmployeeTaskDetailDialog task={task("in_progress")} onClose={vi.fn()} />);
    const tools = screen.getByTestId("task-tools");
    for (const name of [he.completionShowHint, he.completionListenHint, he.taskChatSection]) {
      expect(tools.contains(screen.getByRole("button", { name }))).toBe(true);
    }
    const status = screen.getByTestId("task-status-chip-in_progress");
    expect(status.parentElement).toBe(tools.parentElement);
  });

  it("draws the task chat as a speech bubble, not a question mark", () => {
    render(<EmployeeTaskDetailDialog task={task("in_progress")} onClose={vi.fn()} />);
    const chat = screen.getByRole("button", { name: he.taskChatSection });
    expect(chat.querySelector("[data-testid='ChatBubbleOutlineRoundedIcon']")).toBeTruthy();
    expect(chat.querySelector("[data-testid='HelpOutlineRoundedIcon']")).toBeNull();
  });

  it("keeps only the chat icon when there is nothing to read", () => {
    render(
      <EmployeeTaskDetailDialog task={{ ...task("in_progress"), title: "", description: "" }} onClose={vi.fn()} />,
    );
    expect(screen.queryByRole("button", { name: he.completionShowHint })).toBeNull();
    const tools = screen.getByTestId("task-tools");
    expect(tools.contains(screen.getByRole("button", { name: he.taskChatSection }))).toBe(true);
  });

  it("shows the status and the due time in the header under the name, not in the scrolling body", () => {
    render(<EmployeeTaskDetailDialog task={task("in_progress")} onClose={vi.fn()} />);
    const status = screen.getByTestId("task-status-chip-in_progress");
    const time = screen.getByText(new RegExp(`${he.dueAt}:`));
    const title = screen.getByText("צילום מדף");
    expect(title.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(status.parentElement).toBe(time.parentElement);
  });

  it("puts the title and the close button on the first line, status, time and icons on the second", () => {
    render(<EmployeeTaskDetailDialog task={task("in_progress")} onClose={vi.fn()} />);
    const close = screen.getAllByRole("button", { name: he.close }).find((button) =>
      button.querySelector("[data-testid='CloseRoundedIcon']"),
    ) as HTMLElement;
    const titleRow = close.parentElement as HTMLElement;
    expect(titleRow.contains(screen.getByText("צילום מדף"))).toBe(true);
    const row = screen.getByTestId("task-status-row");
    expect(titleRow.contains(row)).toBe(false);
    expect(titleRow.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(row.contains(screen.getByTestId("task-status-chip-in_progress"))).toBe(true);
    expect(row.contains(screen.getByText(new RegExp(`${he.dueAt}:`)))).toBe(true);
    expect(row.contains(screen.getByTestId("task-tools"))).toBe(true);
  });

  it("hides the manager's examples behind a ? icon next to the other tools", () => {
    render(
      <EmployeeTaskDetailDialog
        task={{ ...task("in_progress"), reference_photo_url: "/ref.jpg", reference_video_url: "/ref.mp4" }}
        onClose={vi.fn()}
      />,
    );
    const help = screen.getByRole("button", { name: he.taskReferenceMediaLabel });
    expect(screen.getByTestId("task-tools").contains(help)).toBe(true);
    expect(help.querySelector("[data-testid='HelpOutlineRoundedIcon']")).toBeTruthy();
    expect(document.querySelector("img[src='/ref.jpg']")).toBeNull();
    fireEvent.click(help);
    expect(document.querySelector("img[src='/ref.jpg']")).toBeTruthy();
    expect(document.querySelector("video[src='/ref.mp4']")).toBeTruthy();
  });

  it("shows no ? icon when the manager attached nothing", () => {
    render(<EmployeeTaskDetailDialog task={task("in_progress")} onClose={vi.fn()} />);
    expect(screen.queryByRole("button", { name: he.taskReferenceMediaLabel })).toBeNull();
  });

  it("does not repeat the task description above the sub-task squares", () => {
    render(<EmployeeTaskDetailDialog task={task("in_progress")} onClose={vi.fn()} />);
    expect(screen.queryByText("לצלם את המדף")).toBeNull();
  });

  it("opens the task chat with the step name already written when the oved asks a question", () => {
    render(
      <EmployeeTaskDetailDialog
        task={{
          ...task("in_progress"),
          completion_requirements: [{ kind: "photo", title: "מדף חלב" }],
        }}
        capture={capture()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("task-chat-panel")).toBeNull();
    fireEvent.click(screen.getByLabelText(he.subtaskAsk));
    expect(screen.getByTestId("task-chat-panel").getAttribute("data-draft")).toBe(
      he.subtaskQuestionDraft("מדף חלב"),
    );
  });

  it("does not show do-task when waiting for manager review", () => {
    render(
      <EmployeeTaskDetailDialog
        task={task("pending_review")}
        onClose={vi.fn()}
        onDoTask={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: he.doTask })).toBeNull();
    expect(screen.queryByRole("button", { name: he.markDone })).toBeNull();
  });

  it("shows the completed status, not a waiting-for-approval one, to the oved", () => {
    render(<EmployeeTaskDetailDialog task={task("pending_review")} onClose={vi.fn()} />);
    expect(screen.queryByText(he.taskStatusLabels.pending_review)).toBeNull();
    expect(screen.getByText(he.taskStatusLabels.completed)).toBeTruthy();
  });

  it("opens the chat from the button while the task waits for approval", () => {
    render(<EmployeeTaskDetailDialog task={task("pending_review")} onClose={vi.fn()} />);
    expect(screen.queryByTestId("task-chat-panel")).toBeNull();
    expect(screen.getByText(he.taskNoReferenceMedia)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: he.taskChatSection }));
    expect(screen.getByTestId("task-chat-panel")).toBeTruthy();
  });

  it("shows submitted photo, video and audio when the oved reopens a finished task", () => {
    render(
      <EmployeeTaskDetailDialog
        task={{
          ...task("completed"),
          reference_photo_url: "/ref.jpg",
          reference_video_url: "/ref.mp4",
          reference_audio_url: "/ref.webm",
          completion: {
            id: "c1",
            occurrence_id: "t1",
            status: "completed",
            note: null,
            photo_path: "/p.jpg",
            video_path: "/v.mp4",
            audio_path: "/a.webm",
            not_completed_reason: null,
            completed_by_id: "u1",
            completed_at: "2026-08-25T12:00:00+03:00",
            manager_review_status: "approved",
          },
        }}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: he.taskReferenceMediaLabel }));
    expect(document.querySelector("img[src='/ref.jpg']")).toBeTruthy();
    expect(document.querySelector("video[src='/ref.mp4']")).toBeTruthy();
    expect(document.querySelector("audio[src='/ref.webm']")).toBeTruthy();
    expect(screen.getByText(he.completionMediaAdded)).toBeTruthy();
    expect(document.querySelector("img[src='/p.jpg']")).toBeTruthy();
    expect(document.querySelector("video[src='/v.mp4']")).toBeTruthy();
    expect(screen.getByTestId("compact-audio-player")).toBeTruthy();
  });

  it("shows submitted media while waiting for menahel ichour", () => {
    render(
      <EmployeeTaskDetailDialog
        task={{
          ...task("pending_review"),
          completion: {
            id: "c1",
            occurrence_id: "t1",
            status: "completed",
            note: null,
            photo_path: "/oved.jpg",
            video_path: null,
            audio_path: "/oved.webm",
            not_completed_reason: null,
            completed_by_id: "u1",
            completed_at: "2026-08-25T12:00:00+03:00",
            manager_review_status: "pending",
          },
        }}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByAltText(he.taskReferencePhoto)).toBeTruthy();
    expect(screen.getByTestId("compact-audio-player")).toBeTruthy();
  });
});
