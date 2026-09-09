import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EditDialogSaveActions, { networkSaveNeedsConfirm } from "./EditDialogSaveActions";
import { he } from "../../i18n/he";

function confirmDialog() {
  return screen.getByRole("dialog", { name: he.fixedTaskUpdateAllBranches });
}

describe("networkSaveNeedsConfirm", () => {
  it("asks for confirm only when every snif is updated", () => {
    expect(networkSaveNeedsConfirm(true)).toBe(true);
    expect(networkSaveNeedsConfirm(false)).toBe(false);
  });
});

describe("EditDialogSaveActions", () => {
  it("saves immediately when the network checkbox is off", () => {
    const onSave = vi.fn();
    render(
      <EditDialogSaveActions
        applyToNetwork={false}
        onCancel={vi.fn()}
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: he.submit }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog", { name: he.fixedTaskUpdateAllBranches })).toBeNull();
  });

  it("opens a confirm window before saving every snif", () => {
    const onSave = vi.fn();
    render(
      <EditDialogSaveActions
        applyToNetwork
        onCancel={vi.fn()}
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: he.submit }));
    expect(onSave).not.toHaveBeenCalled();
    const dialog = confirmDialog();
    expect(within(dialog).getByText(he.fixedTaskUpdateAllBranchesConfirm)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: he.confirm }));
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("lets the menahel close the confirm window without saving", async () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(
      <EditDialogSaveActions
        applyToNetwork
        onCancel={onCancel}
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: he.submit }));
    fireEvent.click(within(confirmDialog()).getByRole("button", { name: he.cancel }));
    expect(onSave).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: he.fixedTaskUpdateAllBranches })).toBeNull();
    });
    expect(screen.getByRole("button", { name: he.submit })).toBeTruthy();
  });
});
