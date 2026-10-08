import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";
import { he } from "../../i18n/he";

const base = { open: true, title: "מחיקה", message: "בטוחים?", onCancel: vi.fn(), onConfirm: vi.fn() };

describe("ConfirmDeleteDialog", () => {
  it("recalls the name of the item being deleted", () => {
    render(<ConfirmDeleteDialog {...base} itemName="ניקיון בוקר" />);
    expect(screen.getByText("ניקיון בוקר")).toBeTruthy();
    expect(screen.getByText("בטוחים?")).toBeTruthy();
  });

  it("confirms and cancels", () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(<ConfirmDeleteDialog {...base} onCancel={onCancel} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: he.taskDeleteConfirm }));
    fireEvent.click(screen.getByRole("button", { name: he.cancel }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("shows the all-snifim option only when asked, and reports changes", () => {
    const onOptionChange = vi.fn();
    const { rerender } = render(<ConfirmDeleteDialog {...base} />);
    expect(screen.queryByRole("checkbox")).toBeNull();
    rerender(<ConfirmDeleteDialog {...base} optionLabel="בכל הסניפים" onOptionChange={onOptionChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "בכל הסניפים" }));
    expect(onOptionChange).toHaveBeenCalledWith(true);
  });

  it("blocks both buttons while deleting", () => {
    render(<ConfirmDeleteDialog {...base} saving />);
    expect((screen.getByRole("button", { name: he.cancel }) as HTMLButtonElement).disabled).toBe(true);
  });
});
