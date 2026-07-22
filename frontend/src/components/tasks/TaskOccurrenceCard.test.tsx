import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import TaskOccurrenceCard from "./TaskOccurrenceCard";
import { he } from "../../i18n/he";
import type { TaskOccurrence } from "../../services/taskService";
import { taskCardBackgroundUrl } from "../../utils/taskCardBackground";

vi.mock("../../utils/isNativeApp", () => ({
  isNativeApp: () => false,
}));

vi.mock("../../utils/taskCardBackground", () => ({
  taskCardBackgroundUrl: vi.fn(() => null),
}));

vi.mock("../../utils/mediaUrl", () => ({
  mediaUrl: (p: string | null) => p,
}));

vi.mock("./TaskChatPanel", () => ({
  default: () => <div data-testid="task-chat-panel">{he.taskChatTitle}</div>,
}));

beforeEach(() => {
  vi.mocked(taskCardBackgroundUrl).mockReturnValue(null);
});

function baseTask(over: Partial<TaskOccurrence> = {}): TaskOccurrence {
  return {
    id: "t1",
    template_id: null,
    branch_id: "b1",
    title: "ניקיון מדף",
    description: "לתאר את המדף",
    due_at: "2026-07-22T18:00:00.000Z",
    status: "pending",
    assignee_user_id: "u1",
    department_id: null,
    task_kind: "ad_hoc",
    manager_user_id: "m1",
    photo_required: true,
    started_at: null,
    created_at: "2026-07-21T10:00:00.000Z",
    updated_at: "2026-07-21T10:00:00.000Z",
    manager_name: "מנהל",
    assignee_name: "עובד",
    ...over,
  };
}

describe("TaskOccurrenceCard", () => {
  it("hides chat panel on menahel card by default", () => {
    render(
      <TaskOccurrenceCard
        task={baseTask()}
        index={0}
        onEdit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText("ניקיון מדף")).toBeTruthy();
    expect(screen.getByText(he.taskChatSection)).toBeTruthy();
    expect(screen.queryByTestId("task-chat-panel")).toBeNull();
  });

  it("opens edit from menu and from chat button (menahel)", () => {
    const onEdit = vi.fn();
    render(
      <TaskOccurrenceCard
        task={baseTask()}
        index={0}
        onEdit={onEdit}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText(he.taskMenuMore));
    fireEvent.click(screen.getByText(he.editTask));
    expect(onEdit).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText(he.taskChatSection));
    expect(onEdit).toHaveBeenCalledTimes(2);
  });

  it("keeps chat collapsed by default for oved and opens on toggle", () => {
    const onEdit = vi.fn();
    render(
      <TaskOccurrenceCard
        task={baseTask({ status: "in_progress" })}
        index={0}
        onOpen={vi.fn()}
        onStart={vi.fn()}
        onComplete={vi.fn()}
        onEdit={onEdit}
      />,
    );
    expect(screen.queryByTestId("task-chat-panel")).toBeNull();
    fireEvent.click(screen.getByText(he.taskChatSection));
    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.getByTestId("task-chat-panel")).toBeTruthy();
  });

  it("requires two clicks to delete", () => {
    const onCancel = vi.fn();
    render(
      <TaskOccurrenceCard
        task={baseTask()}
        index={0}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByLabelText(he.taskMenuMore));
    fireEvent.click(screen.getByText(he.taskDelete));
    expect(onCancel).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText(he.taskDeleteConfirm));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("opens task info from menu", () => {
    render(
      <TaskOccurrenceCard
        task={baseTask()}
        index={0}
        onEdit={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText(he.taskMenuMore));
    fireEvent.click(screen.getByText(he.taskInfo));
    expect(screen.getByText(he.taskInfoCreatedBy, { exact: false })).toBeTruthy();
    expect(screen.getByText("מנהל")).toBeTruthy();
  });

  it("opens photo lightbox on tap", async () => {
    vi.mocked(taskCardBackgroundUrl).mockReturnValue("https://example.com/ref.jpg");
    class FakeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      decoding = "";
      set src(_v: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal("Image", FakeImage);

    render(
      <TaskOccurrenceCard
        task={baseTask({ reference_photo_url: "/uploads/ref.jpg" })}
        index={0}
      />,
    );
    const enlarge = await waitFor(() => screen.getByLabelText(he.taskPhotoEnlarge));
    fireEvent.click(enlarge);
    expect(screen.getAllByAltText(he.taskReferencePhoto).length).toBeGreaterThan(0);
    vi.unstubAllGlobals();
  });
});
