import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ManagerTaskEditScreen from "./ManagerTaskEditScreen";
import { he } from "../../../i18n/he";
import { taskService } from "../../../services/taskService";
import { saveOccurrenceEdit } from "../taskOccurrenceEditForm";

const showError = vi.fn();
vi.mock("../../../services/taskService", () => ({ taskService: { getOccurrence: vi.fn() } }));
vi.mock("../../../services/userService", () => ({ userService: { listTeam: vi.fn().mockResolvedValue([]) } }));
vi.mock("../../../context/AuthContext", () => ({ useAuth: () => ({ user: { id: "m1", role: "branch_manager", full_name: "יצחק" } }) }));
vi.mock("../../../context/FeedbackContext", () => ({ useFeedback: () => ({ showError, showSuccess: vi.fn() }) }));
vi.mock("../taskOccurrenceEditForm", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../taskOccurrenceEditForm")>()),
  saveOccurrenceEdit: vi.fn(),
}));
vi.mock("../TaskChatDialog", () => ({ default: ({ open }: { open: boolean }) => (open ? <div data-testid="chat-open" /> : null) }));
vi.mock("../CompletionMediaPreview", () => ({ default: () => <div>media</div> }));
vi.mock("../fixed/studio/StudioCardStack", () => ({ default: () => <div data-testid="card-stack" /> }));
vi.mock("../fixed/studio/StudioPreview", () => ({ default: () => null }));
vi.mock("../fixed/studio/StudioMoreSheet", () => ({
  default: ({ open, remove }: { open: boolean; remove?: { onClick: () => void } }) =>
    open && remove ? <button data-testid="more-delete" onClick={remove.onClick} /> : null,
}));

const employees = [{ id: "u1", full_name: "שמואל" }, { id: "u2", full_name: "דנה" }] as never;

function pendingTask(patch = {}) {
  return {
    id: "t1",
    title: "סתם",
    description: "",
    status: "pending",
    task_kind: "ad_hoc",
    due_at: "2026-11-18T07:30:00Z",
    branch_id: "b1",
    assignee_user_id: "u1",
    assignee_name: "שמואל",
    photo_required: false,
    completion_requirements: [{ kind: "photo", title: "תעודה" }],
    completion: null,
    ...patch,
  } as never;
}

function renderScreen(extra = {}) {
  const props = { onClose: vi.fn(), onSaved: vi.fn(), onSetManagerNext: vi.fn(), onDelete: vi.fn(), ...extra };
  render(<ManagerTaskEditScreen occurrenceId="t1" employees={employees} {...props} />);
  return props;
}

describe("ManagerTaskEditScreen", () => {
  beforeEach(() => {
    showError.mockReset();
    vi.mocked(taskService.getOccurrence).mockReset().mockResolvedValue(pendingTask());
    vi.mocked(saveOccurrenceEdit).mockReset().mockResolvedValue("נשמר");
  });

  it("opens a not-started task in the studio, with no save bar until something changes", async () => {
    renderScreen();
    expect(await screen.findByDisplayValue("סתם")).toBeTruthy();
    expect(screen.getByTestId("fixed-task-studio")).toBeTruthy();
    expect(screen.getByText(he.studioKickerEditDay)).toBeTruthy();
    expect(screen.getByTestId("card-stack")).toBeTruthy();
    expect(screen.queryByTestId("studio-save-bar")).toBeNull();
  });

  it("saves the renamed task, then closes", async () => {
    const props = renderScreen();
    fireEvent.change(await screen.findByDisplayValue("סתם"), { target: { value: "תעודת משלוח" } });
    fireEvent.click(screen.getByText(he.studioSave));
    await waitFor(() => expect(saveOccurrenceEdit).toHaveBeenCalled());
    expect(vi.mocked(saveOccurrenceEdit).mock.calls[0][1].title).toBe("תעודת משלוח");
    await waitFor(() => expect(props.onSaved).toHaveBeenCalledWith("נשמר"));
    expect(props.onClose).toHaveBeenCalled();
  });

  it("blocks the save while the title is empty", async () => {
    renderScreen();
    fireEvent.change(await screen.findByDisplayValue("סתם"), { target: { value: " " } });
    expect(screen.getByTestId("studio-unsaved").textContent).toBe(he.studioNeedTitle);
    fireEvent.click(screen.getByText(he.studioSave));
    expect(saveOccurrenceEdit).not.toHaveBeenCalled();
  });

  it("asks before leaving with unsaved changes", async () => {
    const props = renderScreen();
    fireEvent.change(await screen.findByDisplayValue("סתם"), { target: { value: "אחר" } });
    fireEvent.click(screen.getByTestId("studio-back"));
    expect(props.onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText(he.studioLeaveConfirm));
    expect(props.onClose).toHaveBeenCalled();
  });

  it("keeps « המשימה הבאה », the chat and the deletion", async () => {
    const props = renderScreen();
    await screen.findByDisplayValue("סתם");
    fireEvent.click(screen.getByLabelText(he.managerNextTask));
    expect(props.onSetManagerNext).toHaveBeenCalledWith(expect.objectContaining({ id: "t1" }), true);
    fireEvent.click(screen.getByTestId("studio-open-chat"));
    expect(screen.getByTestId("chat-open")).toBeTruthy();
    fireEvent.click(screen.getByTestId("studio-more"));
    fireEvent.click(screen.getByTestId("more-delete"));
    expect(props.onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: "t1" }));
  });

  it("hides « המשימה הבאה » and the deletion without management rights", async () => {
    renderScreen({ onSetManagerNext: undefined, onDelete: undefined });
    await screen.findByDisplayValue("סתם");
    expect(screen.queryByTestId("studio-manager-next")).toBeNull();
    fireEvent.click(screen.getByTestId("studio-more"));
    expect(screen.queryByTestId("more-delete")).toBeNull();
  });
});
