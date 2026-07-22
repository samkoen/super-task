import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import NewTaskFormDialog from "./NewTaskFormDialog";
import { he } from "../../i18n/he";

vi.mock("./TaskReferenceMediaEditor", () => ({
  default: () => <div data-testid="media-editor" />,
}));

describe("NewTaskFormDialog", () => {
  it("defaults to ad_hoc and blocks submit without assignee", () => {
    const onSubmit = vi.fn();
    render(
      <NewTaskFormDialog
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        branches={[{ id: "b1", name: "סניף", network_id: "n1" } as never]}
        employees={[{ id: "u1", full_name: "עובד", branch_id: "b1" } as never]}
        isBranchManager
        canPickBranch={false}
        defaultBranchId="b1"
        defaultDueAt="2026-07-20T10:00"
      />,
    );
    expect(screen.getByText(he.taskKindLabels.ad_hoc)).toBeTruthy();
    expect(screen.queryByText(he.taskVoiceTitle)).toBeNull();
    const submit = screen.getByRole("button", { name: he.submit });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
  });

  it("allows switching to fixed kind", () => {
    render(
      <NewTaskFormDialog
        open
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        branches={[]}
        employees={[]}
        isBranchManager
        canPickBranch={false}
        defaultBranchId="b1"
        defaultDueAt="2026-07-20T10:00"
      />,
    );
    fireEvent.click(screen.getByText(he.taskKindLabels.fixed));
    expect(screen.getAllByText(he.recurrence).length).toBeGreaterThan(0);
  });

  it("offers gallery as assignee and enables submit without due date", () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <NewTaskFormDialog
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        branches={[{ id: "b1", name: "סניף", network_id: "n1" } as never]}
        employees={[{ id: "u1", full_name: "עובד", branch_id: "b1" } as never]}
        isBranchManager
        canPickBranch={false}
        defaultBranchId="b1"
        defaultDueAt="2026-07-20T10:00"
      />,
    );
    // Sans branche picker : premier combobox = שיוך
    fireEvent.mouseDown(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: he.assignToGallery }));
    expect(screen.getByText(he.assignToGalleryHint)).toBeTruthy();
    expect(screen.queryByLabelText(he.dueAt)).toBeNull();
    const submit = screen.getByRole("button", { name: he.submit });
    expect((submit as HTMLButtonElement).disabled).toBe(false);
  });

  it("hides gallery option when assignee is locked", () => {
    render(
      <NewTaskFormDialog
        open
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        branches={[]}
        employees={[{ id: "u1", full_name: "עובד", branch_id: "b1" } as never]}
        isBranchManager
        canPickBranch={false}
        defaultBranchId="b1"
        defaultDueAt="2026-07-20T10:00"
        defaultAssigneeId="u1"
        lockAssignee
      />,
    );
    expect(screen.queryByText(he.assignToGallery)).toBeNull();
  });
});
