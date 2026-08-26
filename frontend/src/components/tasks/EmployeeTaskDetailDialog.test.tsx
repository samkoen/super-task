import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import EmployeeTaskDetailDialog from "./EmployeeTaskDetailDialog";
import { he } from "../../i18n/he";
import type { TaskStatus } from "../../services/taskService";
import type { EmployeeTaskCaptureProps } from "./EmployeeTaskDetailDialog";

vi.mock("./TaskChatPanel", () => ({
  default: () => <div data-testid="task-chat-panel">{he.taskChatTitle}</div>,
}));

vi.mock("./TaskReferenceMediaDisplay", () => ({
  default: () => null,
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
    allowedKinds,
  }: {
    photoLabel?: string;
    videoLabel?: string;
    allowedKinds?: string[];
  }) => (
    <button type="button">
      {allowedKinds?.[0] === "video" ? videoLabel ?? "video" : photoLabel ?? "photo"}
    </button>
  ),
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
    expect(screen.getByLabelText(he.completionShowHint)).toBeTruthy();
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
    expect(screen.getByLabelText(he.completionShowHint)).toBeTruthy();
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
    expect(screen.getByLabelText(he.completionShowHint)).toBeTruthy();
    expect(screen.getByLabelText(he.completionListenHint)).toBeTruthy();
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
});
