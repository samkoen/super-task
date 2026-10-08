import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Dialog } from "@mui/material";
import AppDialogTitle from "./AppDialogTitle";
import { he } from "../../i18n/he";

function renderTitle(props: Partial<React.ComponentProps<typeof AppDialogTitle>> = {}) {
  const onClose = vi.fn();
  render(
    <Dialog open>
      <AppDialogTitle title="כותרת בדיקה" onClose={onClose} {...props} />
    </Dialog>,
  );
  return onClose;
}

describe("AppDialogTitle", () => {
  it("shows the title and closes through the X button", () => {
    const onClose = renderTitle();
    expect(screen.getByText("כותרת בדיקה")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: he.close }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("disables the X while a send is in progress", () => {
    const onClose = renderTitle({ closeDisabled: true });
    const button = screen.getByRole("button", { name: he.close }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("forwards extra attributes to the title element", () => {
    renderTitle({ "data-system-bug-dialog": "" } as never);
    expect(document.querySelector("[data-system-bug-dialog]")).not.toBeNull();
  });
});
