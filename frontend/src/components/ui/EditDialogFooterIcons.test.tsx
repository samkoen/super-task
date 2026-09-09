import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EditDialogFooterIcons from "./EditDialogFooterIcons";
import { he } from "../../i18n/he";

describe("EditDialogFooterIcons", () => {
  it("exposes cancel and submit by their Hebrew labels", () => {
    render(<EditDialogFooterIcons onCancel={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: he.cancel })).toBeTruthy();
    expect(screen.getByRole("button", { name: he.submit })).toBeTruthy();
  });

  it("fires cancel and submit", () => {
    const onCancel = vi.fn();
    const onSubmit = vi.fn();
    render(<EditDialogFooterIcons onCancel={onCancel} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: he.cancel }));
    fireEvent.click(screen.getByRole("button", { name: he.submit }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("blocks submit while saving", () => {
    const onSubmit = vi.fn();
    render(
      <EditDialogFooterIcons
        onCancel={vi.fn()}
        onSubmit={onSubmit}
        submitting
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: he.submit }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
