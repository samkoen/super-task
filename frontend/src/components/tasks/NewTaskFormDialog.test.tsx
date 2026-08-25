import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    expect(screen.queryByText(he.recurrenceLabels.biweekly)).toBeNull();
    const days = within(screen.getByLabelText(he.weekdays)).getAllByRole("button");
    expect(days[0].textContent).toContain(he.weekdaySun);
    expect(days[days.length - 1].textContent).toContain(he.weekdaySat);
    expect(days[days.length - 1].getAttribute("aria-pressed")).toBe("false");
    expect(screen.queryByLabelText(he.weekday)).toBeNull();
  });

  it("keeps weekday toggles for weekly with a single selected day", () => {
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
        forcedTaskKind="fixed"
      />,
    );
    fireEvent.mouseDown(screen.getByLabelText(he.recurrence));
    fireEvent.click(screen.getByRole("option", { name: he.recurrenceLabels.weekly }));
    const group = screen.getByLabelText(he.weekdays);
    const pressed = within(group)
      .getAllByRole("button")
      .filter((btn) => btn.getAttribute("aria-pressed") === "true");
    expect(pressed).toHaveLength(1);
    expect(screen.queryByLabelText(he.weekday)).toBeNull();
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

  it("lets network manager pick several snifim for a fixed task", () => {
    render(
      <NewTaskFormDialog
        open
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        branches={[
          { id: "b1", name: "א", network_id: "n1" } as never,
          { id: "b2", name: "ב", network_id: "n1" } as never,
        ]}
        employees={[{ id: "u1", full_name: "עובד", branch_id: "b1" } as never]}
        isBranchManager={false}
        canPickBranch
        defaultBranchId="b1"
        defaultDueAt="2026-07-20T10:00"
        forcedTaskKind="fixed"
      />,
    );
    expect(screen.getByRole("checkbox", { name: he.branchesSelectAll })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "א" })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "ב" })).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: "ב" }));
    expect(screen.queryByLabelText(he.assignee)).toBeNull();
  });

  it("offers the same snif scope for an ad-hoc task", () => {
    render(
      <NewTaskFormDialog
        open
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        branches={[
          { id: "b1", name: "א", network_id: "n1" } as never,
          { id: "b2", name: "ב", network_id: "n1" } as never,
        ]}
        employees={[{ id: "u1", full_name: "עובד", branch_id: "b1" } as never]}
        isBranchManager={false}
        canPickBranch
        defaultBranchId="b1"
        defaultDueAt="2026-07-20T10:00"
      />,
    );
    expect(screen.getByRole("checkbox", { name: he.branchesSelectAll })).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: "ב" }));
    expect(screen.queryByLabelText(he.assignee)).toBeNull();
    expect(screen.getByText(he.dueAt)).toBeTruthy();
  });

  it.each([
    ["ad_hoc" as const, undefined],
    ["fixed" as const, "fixed" as const],
  ])("submits one / selected / all snif scopes for %s", async (kind, forced) => {
    const branches = [
      { id: "b1", name: "א", network_id: "n1" } as never,
      { id: "b2", name: "ב", network_id: "n1" } as never,
      { id: "b3", name: "ג", network_id: "n1" } as never,
    ];
    const employees = [{ id: "u1", full_name: "עובד א", branch_id: "b1" } as never];
    const baseProps = {
      open: true,
      onClose: vi.fn(),
      branches,
      employees,
      isBranchManager: false,
      canPickBranch: true,
      defaultBranchId: "b1",
      defaultDueAt: "2026-07-20T10:00",
      defaultAssigneeId: "u1",
      forcedTaskKind: forced,
    };

    const onOne = vi.fn().mockResolvedValue(undefined);
    const { unmount: unmountOne } = render(
      <NewTaskFormDialog {...baseProps} onSubmit={onOne} />,
    );
    fireEvent.change(screen.getByLabelText(he.taskTitle), { target: { value: "כותרת" } });
    fireEvent.click(screen.getByRole("button", { name: he.submit }));
    await waitFor(() => expect(onOne).toHaveBeenCalled());
    expect(onOne.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        task_kind: kind,
        apply_to_network: false,
        branch_id: "b1",
        assignee_user_id: "u1",
      }),
    );
    unmountOne();

    const onSelected = vi.fn().mockResolvedValue(undefined);
    const { unmount: unmountSelected } = render(
      <NewTaskFormDialog {...baseProps} onSubmit={onSelected} />,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "ב" }));
    fireEvent.change(screen.getByLabelText(he.taskTitle), { target: { value: "כותרת" } });
    fireEvent.click(screen.getByRole("button", { name: he.submit }));
    await waitFor(() => expect(onSelected).toHaveBeenCalled());
    expect(onSelected.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        task_kind: kind,
        apply_to_network: true,
        branch_ids: ["b1", "b2"],
      }),
    );
    unmountSelected();

    const onAll = vi.fn().mockResolvedValue(undefined);
    render(<NewTaskFormDialog {...baseProps} onSubmit={onAll} />);
    fireEvent.click(screen.getByRole("checkbox", { name: he.branchesSelectAll }));
    fireEvent.change(screen.getByLabelText(he.taskTitle), { target: { value: "כותרת" } });
    fireEvent.click(screen.getByRole("button", { name: he.submit }));
    await waitFor(() => expect(onAll).toHaveBeenCalled());
    expect(onAll.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        task_kind: kind,
        apply_to_network: true,
      }),
    );
    expect(onAll.mock.calls[0][0].branch_ids).toBeUndefined();
  });

  it("includes start_url on submit and blocks an invalid link", async () => {
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
        defaultAssigneeId="u1"
      />,
    );
    const url = "https://my.agroline.co.il/main/azmanot/client-orders/create";
    fireEvent.change(screen.getByLabelText(he.startUrl), { target: { value: "not-a-url" } });
    fireEvent.click(screen.getByRole("button", { name: he.submit }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(he.startUrlInvalid)).toBeTruthy();

    fireEvent.change(screen.getByLabelText(he.startUrl), { target: { value: url } });
    fireEvent.click(screen.getByRole("button", { name: he.submit }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].start_url).toBe(url);
  });
});
