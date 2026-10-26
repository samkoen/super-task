import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FixedTaskGeneralForm, { type FixedTaskGeneralFormProps } from "./FixedTaskGeneralForm";
import { fixtureBranch, fixtureGroup } from "./fixedTaskFixtures";
import { he } from "../../../i18n/he";
import { groupToGeneralForm, groupToMedia } from "../../../utils/fixedTaskGroups";

vi.mock("../TaskReferenceMediaEditor", () => ({ default: () => <div data-testid="media" /> }));
vi.mock("../CompletionRequirementsEditor", () => ({ default: () => <div data-testid="reqs" /> }));

function props(over: Partial<FixedTaskGeneralFormProps> = {}): FixedTaskGeneralFormProps {
  const group = over.group ?? fixtureGroup({ recurrence: "weekly", weekly_days: "0" });
  return {
    group,
    form: groupToGeneralForm(group),
    onFormChange: vi.fn(),
    media: groupToMedia(group),
    onMediaChange: vi.fn(),
    employees: [{ id: "u1", full_name: "דנה" } as never],
    saving: false,
    onTranscript: vi.fn(),
    onError: vi.fn(),
    ...over,
  };
}

describe("FixedTaskGeneralForm", () => {
  it("shows current values and a live schedule summary", () => {
    const base = props();
    render(<FixedTaskGeneralForm {...base} form={{ ...base.form, due_time: "14:30" }} />);
    expect((screen.getByLabelText(he.taskTitle) as HTMLInputElement).value).toBe("בדיקת קירור");
    expect(screen.getByTestId("schedule-summary").textContent).toContain("14:30");
  });

  it("reports edits to the parent", () => {
    const onFormChange = vi.fn();
    const base = props({ onFormChange });
    render(<FixedTaskGeneralForm {...base} />);
    fireEvent.change(screen.getByLabelText(he.taskTitle), { target: { value: "חדש" } });
    expect(onFormChange).toHaveBeenCalledWith({ ...base.form, title: "חדש" });
  });

  it("does not ask for an assignee on a network task (it is set per branch)", () => {
    render(<FixedTaskGeneralForm {...props()} />);
    expect(screen.queryByLabelText(new RegExp(he.assignee))).toBeNull();
  });

  it("asks for the assignee on a single-branch task", () => {
    const single = fixtureGroup({ is_network: false, branches: [fixtureBranch()] });
    render(<FixedTaskGeneralForm {...props({ group: single })} />);
    expect(screen.getAllByText(he.assignee).length).toBeGreaterThan(0);
  });

  it("saves the delivery-note choice with the rest of the form", () => {
    const onFormChange = vi.fn();
    const base = props({ onFormChange });
    render(<FixedTaskGeneralForm {...base} />);
    fireEvent.click(screen.getByRole("checkbox", { name: he.deliveryNoteOpenModel }));
    expect(onFormChange).toHaveBeenCalledWith({ ...base.form, opened_by_delivery_note: true });
  });
});

describe("customer link (single-branch task only)", () => {
  const single = fixtureGroup({ is_network: false, branches: [fixtureBranch()], opened_by_delivery_note: true });

  function renderLink(onLinkCustomer: (name: string) => Promise<boolean>) {
    const base = props({ group: single, onLinkCustomer });
    render(<FixedTaskGeneralForm {...base} form={{ ...base.form, opened_by_delivery_note: true }} />);
    return screen.getByLabelText(he.deliveryNoteCustomer) as HTMLInputElement;
  }

  it("links a customer only when a name is typed, then clears the field", async () => {
    const onLink = vi.fn().mockResolvedValue(true);
    const field = renderLink(onLink);
    const button = screen.getByRole("button", { name: he.deliveryNoteLinkCustomer }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.change(field, { target: { value: "  יד השם " } });
    fireEvent.click(button);
    await waitFor(() => expect(onLink).toHaveBeenCalledWith("יד השם"));
    await waitFor(() => expect(field.value).toBe(""));
  });

  it("keeps the typed name when linking fails", async () => {
    const onLink = vi.fn().mockResolvedValue(false);
    const field = renderLink(onLink);
    fireEvent.change(field, { target: { value: "יד השם" } });
    fireEvent.click(screen.getByRole("button", { name: he.deliveryNoteLinkCustomer }));
    await waitFor(() => expect(onLink).toHaveBeenCalled());
    expect(field.value).toBe("יד השם");
  });

  it("hides the customer link for a network task", () => {
    const network = fixtureGroup({ opened_by_delivery_note: true });
    const base = props({ group: network, onLinkCustomer: vi.fn() });
    render(<FixedTaskGeneralForm {...base} form={{ ...base.form, opened_by_delivery_note: true }} />);
    expect(screen.queryByLabelText(he.deliveryNoteCustomer)).toBeNull();
  });
});
