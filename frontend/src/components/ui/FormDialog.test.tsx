import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FormDialog from "./FormDialog";
import { he } from "../../i18n/he";

describe("FormDialog", () => {
  it("shows the title, the form and the actions", () => {
    render(
      <FormDialog open title="משימה חדשה" onClose={vi.fn()} actions={<button type="button">שמירה</button>}>
        <input aria-label="field" />
      </FormDialog>,
    );
    expect(screen.getByText("משימה חדשה")).toBeTruthy();
    expect(screen.getByLabelText("field")).toBeTruthy();
    expect(screen.getByRole("button", { name: "שמירה" })).toBeTruthy();
  });

  it("closes from the X button", () => {
    const onClose = vi.fn();
    render(
      <FormDialog open title="t" onClose={onClose} actions={null}>
        <span>x</span>
      </FormDialog>,
    );
    fireEvent.click(screen.getByRole("button", { name: he.close }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("cannot be closed while busy", () => {
    const onClose = vi.fn();
    render(
      <FormDialog open title="t" onClose={onClose} busy actions={null}>
        <span>x</span>
      </FormDialog>,
    );
    const close = screen.getByRole("button", { name: he.close }) as HTMLButtonElement;
    expect(close.disabled).toBe(true);
    fireEvent.click(close);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("renders nothing when closed", () => {
    render(
      <FormDialog open={false} title="hidden" onClose={vi.fn()} actions={null}>
        <span>x</span>
      </FormDialog>,
    );
    expect(screen.queryByText("hidden")).toBeNull();
  });
});
