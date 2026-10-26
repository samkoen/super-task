import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import FixedTaskWizard, { type FixedTaskWizardProps } from "./FixedTaskWizard";
import { he } from "../../../i18n/he";
import type { User } from "../../../services/api";
import {
  MANAGER_FIXED_TASKS_DRAFT_KEY,
  clearFixedTaskCreateDraft,
  writeFixedTaskCreateForm,
} from "../../../utils/fixedTaskScreenDraft";
import { newWizardForm } from "../../../utils/fixedTaskWizard";

vi.mock("../TaskReferenceMediaEditor", () => ({
  default: () => <div data-testid="media-editor" />,
}));

const emp = (id: string, branch_id: string) =>
  ({ id, full_name: `עובד ${id}`, role: "employee", is_active: true, branch_id }) as User;

function props(overrides: Partial<FixedTaskWizardProps> = {}): FixedTaskWizardProps {
  return {
    open: true,
    onClose: vi.fn(),
    onSubmit: vi.fn().mockResolvedValue(undefined),
    branches: [
      { id: "b1", name: "תל אביב", network_id: "n1" },
      { id: "b2", name: "חיפה", network_id: "n1" },
      { id: "b3", name: "אילת", network_id: "n1" },
    ] as never,
    employees: [emp("e1a", "b1"), emp("e1b", "b1"), emp("e2", "b2")],
    canPickBranch: true,
    defaultBranchId: "",
    ...overrides,
  };
}

const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));

function goToWhere() {
  fireEvent.change(screen.getByLabelText(he.taskTitle), { target: { value: "פתיחת סניף" } });
  click(he.fixedWizardNext);
  click(he.fixedWizardNext);
}

afterEach(() => clearFixedTaskCreateDraft(MANAGER_FIXED_TASKS_DRAFT_KEY));

describe("FixedTaskWizard", () => {
  it("blocks the first step until there is a title or a description", () => {
    render(<FixedTaskWizard {...props()} />);
    expect((screen.getByRole("button", { name: he.fixedWizardNext }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId("wizard-blocker").textContent).toBe(he.fixedWizardNeedContent);
    fireEvent.change(screen.getByLabelText(he.taskTitle), { target: { value: "ניקיון" } });
    expect((screen.getByRole("button", { name: he.fixedWizardNext }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("walks through what, when and where, with a back button", () => {
    render(<FixedTaskWizard {...props()} />);
    expect(screen.getByTestId("wizard-stepper").textContent).toContain(he.fixedWizardProgress(1, 3));
    fireEvent.change(screen.getByLabelText(he.taskTitle), { target: { value: "ניקיון" } });
    click(he.fixedWizardNext);
    expect(screen.getByTestId("schedule-summary")).toBeTruthy();
    click(he.fixedWizardNext);
    expect(screen.getByTestId("wizard-recap").textContent).toContain("3 סניפים");
    click(he.fixedWizardBack);
    expect(screen.getByTestId("schedule-summary")).toBeTruthy();
  });

  it("closes from the first step with the cancel button", () => {
    const onClose = vi.fn();
    render(<FixedTaskWizard {...props({ onClose })} />);
    click(he.cancel);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("proposes the first employee per branch and warns about a branch without one", () => {
    render(<FixedTaskWizard {...props()} />);
    goToWhere();
    expect(screen.getByTestId("assignee-row-b1").textContent).toContain("עובד e1a");
    expect(screen.getByTestId("assignee-row-b2").textContent).toContain("עובד e2");
    expect(screen.getByTestId("assignee-row-b3").textContent).toContain(he.fixedWizardNoEmployee);
  });

  it("creates one copy per branch with the assignee picked for each", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<FixedTaskWizard {...props({ onSubmit })} />);
    goToWhere();
    const row = screen.getByTestId("assignee-row-b1");
    fireEvent.mouseDown(within(row).getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: "עובד e1b" }));
    click(he.newTaskCreate);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      task_kind: "fixed",
      title: "פתיחת סניף",
      apply_to_network: true,
      branch_assignees: { b1: "e1b", b2: "e2" },
    });
  });

  it("unticking every branch blocks the creation", () => {
    render(<FixedTaskWizard {...props()} />);
    goToWhere();
    fireEvent.click(screen.getByLabelText(he.branchesSelectAll));
    expect(screen.getByTestId("wizard-blocker").textContent).toContain(he.newTaskMissingBranches);
    expect((screen.getByRole("button", { name: he.newTaskCreate }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("lets a branch manager pick an assignee for his own branch", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <FixedTaskWizard
        {...props({ onSubmit, canPickBranch: false, defaultBranchId: "b1", branches: [] })}
      />,
    );
    goToWhere();
    expect((screen.getByRole("button", { name: he.newTaskCreate }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.mouseDown(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: "עובד e1a" }));
    click(he.newTaskCreate);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      branch_id: "b1",
      assignee_user_id: "e1a",
      apply_to_network: false,
    });
  });

  it("reopens on the saved step with the saved content", () => {
    writeFixedTaskCreateForm(MANAGER_FIXED_TASKS_DRAFT_KEY, {
      ...newWizardForm(""),
      title: "שמור",
      step: "when",
    });
    render(<FixedTaskWizard {...props({ rememberKey: MANAGER_FIXED_TASKS_DRAFT_KEY })} />);
    expect(screen.getByTestId("wizard-stepper").textContent).toContain(he.fixedWizardProgress(2, 3));
    click(he.fixedWizardBack);
    expect((screen.getByLabelText(he.taskTitle) as HTMLInputElement).value).toBe("שמור");
  });
});
