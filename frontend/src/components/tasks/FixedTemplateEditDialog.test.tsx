import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FixedTemplateEditDialog, {
  type FixedTemplateEditDialogProps,
  type FixedTemplateEditForm,
} from "./FixedTemplateEditDialog";
import { he } from "../../i18n/he";
import type { TaskTemplate } from "../../services/taskService";

vi.mock("./TaskReferenceMediaEditor", () => ({ default: () => <div data-testid="media" /> }));
vi.mock("./CompletionRequirementsEditor", () => ({ default: () => <div data-testid="reqs" /> }));

const template = {
  id: "t1",
  branch_id: "b1",
  recurrence: "weekly",
  due_time: "09:00",
  weekly_days: "0",
  monthly_day: null,
} as unknown as TaskTemplate;

const form: FixedTemplateEditForm = {
  title: "ספירה",
  description: "",
  due_time: "09:00",
  weekly_days: "0",
  assignee_user_id: "u1",
  is_active: true,
  ops_category: "",
  completion_requirements: [],
  is_work_start: false,
  is_work_end: false,
  start_url: "",
  apply_to_network: false,
};

function props(over: Partial<FixedTemplateEditDialogProps> = {}): FixedTemplateEditDialogProps {
  return {
    template,
    form,
    onFormChange: vi.fn(),
    media: { reference_photo_url: "", reference_video_url: "", reference_audio_url: "" },
    onMediaChange: vi.fn(),
    employees: [{ id: "u1", full_name: "דנה" } as never],
    showNetworkScope: false,
    saving: false,
    onClose: vi.fn(),
    onSave: vi.fn(),
    onDelete: vi.fn(),
    onTranscript: vi.fn(),
    onError: vi.fn(),
    ...over,
  };
}

describe("FixedTemplateEditDialog", () => {
  it("shows the current values and a live schedule summary", () => {
    render(<FixedTemplateEditDialog {...props({ form: { ...form, due_time: "14:30" } })} />);
    expect((screen.getByLabelText(he.taskTitle) as HTMLInputElement).value).toBe("ספירה");
    expect(screen.getByTestId("schedule-summary").textContent).toContain("14:30");
  });

  it("reports edits to the parent", () => {
    const onFormChange = vi.fn();
    render(<FixedTemplateEditDialog {...props({ onFormChange })} />);
    fireEvent.change(screen.getByLabelText(he.taskTitle), { target: { value: "חדש" } });
    expect(onFormChange).toHaveBeenCalledWith({ ...form, title: "חדש" });
  });

  it("saves with a labelled button and deletes from a separate clearly named button", () => {
    const onSave = vi.fn();
    const onDelete = vi.fn();
    render(<FixedTemplateEditDialog {...props({ onSave, onDelete })} />);
    fireEvent.click(screen.getByRole("button", { name: he.saveChanges }));
    expect(onSave).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: he.managerFixedTasksDelete }));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("offers the network scope only when relevant", () => {
    const { rerender } = render(<FixedTemplateEditDialog {...props()} />);
    expect(screen.queryByText(he.fixedTaskUpdateAllBranches)).toBeNull();
    rerender(<FixedTemplateEditDialog {...props({ showNetworkScope: true })} />);
    expect(screen.getByText(he.fixedTaskUpdateAllBranches)).toBeTruthy();
  });

  it("saves the delivery-note choice with the rest of the form", () => {
    const onFormChange = vi.fn();
    render(<FixedTemplateEditDialog {...props({ onFormChange })} />);
    fireEvent.click(screen.getByRole("checkbox", { name: he.deliveryNoteOpenModel }));
    expect(onFormChange).toHaveBeenCalledWith({ ...form, opened_by_delivery_note: true });
  });

  it("links an Agroline customer only when a name is typed", async () => {
    const onLinkCustomer = vi.fn().mockResolvedValue(undefined);
    render(
      <FixedTemplateEditDialog
        {...props({ form: { ...form, opened_by_delivery_note: true }, onLinkCustomer })}
      />,
    );
    const link = screen.getByRole("button", { name: he.deliveryNoteLinkCustomer }) as HTMLButtonElement;
    expect(link.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(he.deliveryNoteCustomer), { target: { value: "  יד השם " } });
    fireEvent.click(link);
    await waitFor(() => expect(onLinkCustomer).toHaveBeenCalledWith("יד השם"));
  });

  it("renders nothing without a template", () => {
    render(<FixedTemplateEditDialog {...props({ template: null, form: null })} />);
    expect(screen.queryByText(he.managerFixedTasksEdit)).toBeNull();
  });
});
