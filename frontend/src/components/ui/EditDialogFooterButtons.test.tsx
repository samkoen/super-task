import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EditDialogFooterButtons from "./EditDialogFooterButtons";
import { he } from "../../i18n/he";

describe("EditDialogFooterButtons", () => {
  it("shows explicit text labels for cancel and save", () => {
    render(<EditDialogFooterButtons onCancel={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: he.cancel })).toBeTruthy();
    expect(screen.getByRole("button", { name: he.saveChanges })).toBeTruthy();
  });

  it("accepts a custom label for the main action", () => {
    render(<EditDialogFooterButtons onCancel={vi.fn()} onSubmit={vi.fn()} submitLabel="שליחה לעובד" />);
    expect(screen.getByRole("button", { name: "שליחה לעובד" })).toBeTruthy();
  });

  it("fires cancel and submit", () => {
    const onCancel = vi.fn();
    const onSubmit = vi.fn();
    render(<EditDialogFooterButtons onCancel={onCancel} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: he.cancel }));
    fireEvent.click(screen.getByRole("button", { name: he.saveChanges }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("blocks submit while saving or when the form is incomplete", () => {
    const onSubmit = vi.fn();
    const { rerender } = render(<EditDialogFooterButtons onCancel={vi.fn()} onSubmit={onSubmit} submitting />);
    const busy = document.querySelector("[aria-busy='true']") as HTMLButtonElement;
    expect(busy.disabled).toBe(true);
    fireEvent.click(busy);
    rerender(<EditDialogFooterButtons onCancel={vi.fn()} onSubmit={onSubmit} submitDisabled />);
    fireEvent.click(screen.getByRole("button", { name: he.saveChanges }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
