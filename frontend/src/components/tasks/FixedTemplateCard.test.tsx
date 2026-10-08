import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FixedTemplateCard from "./FixedTemplateCard";
import { he } from "../../i18n/he";
import type { TaskTemplate } from "../../services/taskService";

const template = {
  id: "t1",
  branch_id: "b1",
  title: "פתיחת סניף",
  description: "",
  recurrence: "daily",
  due_time: "08:30",
  weekly_days: "6,0",
  monthly_day: null,
  assignee_user_id: "u1",
  assignee_name: "דנה",
  branch_name: "תל אביב",
  is_active: true,
  ops_category: null,
} as unknown as TaskTemplate;

describe("FixedTemplateCard", () => {
  it("shows title, schedule, assignee and branch", () => {
    render(<FixedTemplateCard template={template} onEdit={vi.fn()} onToggleActive={vi.fn()} />);
    expect(screen.getByText("פתיחת סניף")).toBeTruthy();
    expect(screen.getByText(/08:30/)).toBeTruthy();
    expect(screen.getByText("דנה · תל אביב")).toBeTruthy();
    expect(screen.getByText(he.active)).toBeTruthy();
  });

  it("flags the tasks that are opened by a delivery note", () => {
    const { rerender } = render(<FixedTemplateCard template={template} onEdit={vi.fn()} onToggleActive={vi.fn()} />);
    expect(screen.queryByText(he.deliveryNotePdf)).toBeNull();
    rerender(
      <FixedTemplateCard
        template={{ ...template, opened_by_delivery_note: true } as unknown as TaskTemplate}
        onEdit={vi.fn()}
        onToggleActive={vi.fn()}
      />,
    );
    expect(screen.getByText(he.deliveryNotePdf)).toBeTruthy();
  });

  it("opens the edit form when the card is tapped", () => {
    const onEdit = vi.fn();
    render(<FixedTemplateCard template={template} onEdit={onEdit} onToggleActive={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: `${he.edit}: פתיחת סניף` }));
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it("toggles active without opening the form", () => {
    const onEdit = vi.fn();
    const onToggle = vi.fn();
    render(<FixedTemplateCard template={template} onEdit={onEdit} onToggleActive={onToggle} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onToggle).toHaveBeenCalledOnce();
    expect(onEdit).not.toHaveBeenCalled();
  });

  it("says when nobody is assigned and when the task is paused", () => {
    render(
      <FixedTemplateCard
        template={{ ...template, assignee_name: null, branch_name: null, is_active: false } as unknown as TaskTemplate}
        networkChip="בכל הסניפים"
        onEdit={vi.fn()}
        onToggleActive={vi.fn()}
      />,
    );
    expect(screen.getByText(he.noAssignee)).toBeTruthy();
    expect(screen.getByText(he.inactive)).toBeTruthy();
    expect(screen.getByText("בכל הסניפים")).toBeTruthy();
  });
});
