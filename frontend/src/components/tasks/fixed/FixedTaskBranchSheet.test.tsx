import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FixedTaskBranchSheet, { type FixedTaskBranchSheetProps } from "./FixedTaskBranchSheet";
import { fixtureBranch, fixtureGroup } from "./fixedTaskFixtures";
import { he } from "../../../i18n/he";
import { requirementsSummary } from "../../../utils/completionRequirementList";

function props(over: Partial<FixedTaskBranchSheetProps> = {}): FixedTaskBranchSheetProps {
  return {
    group: fixtureGroup(),
    branch: fixtureBranch(),
    employees: [
      { id: "u1", full_name: "דנה" } as never,
      { id: "u2", full_name: "רון" } as never,
    ],
    saving: false,
    onClose: vi.fn(),
    onSave: vi.fn(),
    ...over,
  };
}

const toggle = (label: string) =>
  screen.getByRole("checkbox", { name: `${he.fixedBranchCustomToggle}: ${label}` }) as HTMLInputElement;

describe("FixedTaskBranchSheet", () => {
  it("shows the branch name, the default value and no input while a field is not customized", () => {
    render(<FixedTaskBranchSheet {...props()} />);
    expect(screen.getByText(he.fixedBranchSheetTitle("תל אביב"))).toBeTruthy();
    expect(screen.getByText(he.fixedBranchDefaultValue("09:00"))).toBeTruthy();
    expect(toggle(he.dueTime).checked).toBe(false);
    expect(screen.queryByDisplayValue("09:00")).toBeNull();
  });

  it("reveals the time input once customization is switched on", () => {
    render(<FixedTaskBranchSheet {...props()} />);
    fireEvent.click(toggle(he.dueTime));
    expect((screen.getByLabelText(he.dueTime, { selector: "input[type=time]" }) as HTMLInputElement).value).toBe("09:00");
  });

  it("starts with customization on for an adapted field", () => {
    const branch = fixtureBranch({ due_time: "07:30", overridden_fields: ["due_time"] });
    render(<FixedTaskBranchSheet {...props({ branch })} />);
    expect(toggle(he.dueTime).checked).toBe(true);
    expect(screen.getByDisplayValue("07:30")).toBeTruthy();
  });

  it("only offers weekday customization for daily and weekly tasks", () => {
    const monthly = fixtureGroup({ recurrence: "monthly" });
    render(<FixedTaskBranchSheet {...props({ group: monthly })} />);
    expect(screen.queryByRole("checkbox", { name: `${he.fixedBranchCustomToggle}: ${he.fixedBranchDaysLabel}` })).toBeNull();
  });

  it("saves the edited form", () => {
    const onSave = vi.fn();
    render(<FixedTaskBranchSheet {...props({ onSave })} />);
    fireEvent.click(toggle(he.dueTime));
    fireEvent.change(screen.getByDisplayValue("09:00"), { target: { value: "07:30" } });
    fireEvent.click(screen.getByRole("button", { name: he.fixedBranchSave }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ custom_due_time: true, due_time: "07:30" }));
  });

  it("switches every customization back to the default with one button", () => {
    const branch = fixtureBranch({ due_time: "07:30", overridden_fields: ["due_time"] });
    render(<FixedTaskBranchSheet {...props({ branch })} />);
    fireEvent.click(screen.getByRole("button", { name: he.fixedBranchResetAll }));
    expect(toggle(he.dueTime).checked).toBe(false);
  });

  it("lets one branch have its own proof requirements, starting from the general list", () => {
    const onSave = vi.fn();
    const group = fixtureGroup({ completion_requirements: [{ kind: "photo", title: "מדף" }], photo_required: true });
    render(<FixedTaskBranchSheet {...props({ group, onSave })} />);
    const label = he.taskFormSectionProof;
    expect(screen.getByText(he.fixedBranchDefaultValue(requirementsSummary([{ kind: "photo", title: "מדף" }])))).toBeTruthy();
    expect(screen.queryByText(he.completionAddVideoReq)).toBeNull();
    fireEvent.click(toggle(label));
    fireEvent.click(screen.getByRole("button", { name: he.completionAddVideoReq }));
    fireEvent.click(screen.getByRole("button", { name: he.fixedBranchSave }));
    const saved = onSave.mock.calls[0][0];
    expect(saved.custom_completion).toBe(true);
    expect(saved.completion_requirements.map((r: { kind: string }) => r.kind)).toEqual(["photo", "video"]);
  });

  it("shows the default as 'none' when the general list is empty, and resets it with the reset button", () => {
    const branch = fixtureBranch({
      completion_requirements: [{ kind: "photo" }],
      overridden_fields: ["completion_requirements"],
    });
    render(<FixedTaskBranchSheet {...props({ branch })} />);
    expect(screen.getByText(he.fixedBranchDefaultValue(he.fixedBranchNoProof))).toBeTruthy();
    expect(toggle(he.taskFormSectionProof).checked).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: he.fixedBranchResetAll }));
    expect(toggle(he.taskFormSectionProof).checked).toBe(false);
  });

  it("cannot be saved without an assignee", () => {
    const branch = fixtureBranch({ assignee_user_id: null, assignee_name: null });
    render(<FixedTaskBranchSheet {...props({ branch })} />);
    expect((screen.getByRole("button", { name: he.fixedBranchSave }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("offers removal only when a handler is provided", async () => {
    const onRemove = vi.fn();
    const { rerender } = render(<FixedTaskBranchSheet {...props()} />);
    expect(screen.queryByRole("button", { name: he.fixedDetailRemoveFromBranch })).toBeNull();
    rerender(<FixedTaskBranchSheet {...props({ onRemove })} />);
    fireEvent.click(screen.getByRole("button", { name: he.fixedDetailRemoveFromBranch }));
    await waitFor(() => expect(onRemove).toHaveBeenCalledOnce());
  });

  it("shows the customer link only for delivery-note tasks", () => {
    const onLinkCustomer = vi.fn();
    const { rerender } = render(<FixedTaskBranchSheet {...props({ onLinkCustomer })} />);
    expect(screen.queryByLabelText(he.deliveryNoteCustomer)).toBeNull();
    rerender(
      <FixedTaskBranchSheet
        {...props({ onLinkCustomer, group: fixtureGroup({ opened_by_delivery_note: true }) })}
      />,
    );
    expect(screen.getByLabelText(he.deliveryNoteCustomer)).toBeTruthy();
  });
});
