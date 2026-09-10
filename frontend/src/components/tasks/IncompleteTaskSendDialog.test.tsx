import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import IncompleteTaskSendDialog from "./IncompleteTaskSendDialog";
import { he } from "../../i18n/he";

describe("IncompleteTaskSendDialog", () => {
  it("blocks send without an explanation", () => {
    const onConfirm = vi.fn();
    render(
      <IncompleteTaskSendDialog open onClose={vi.fn()} onConfirm={onConfirm} />,
    );
    fireEvent.click(screen.getByRole("button", { name: he.incompleteTaskSendAnyway }));
    expect(screen.getByText(he.incompleteTaskReasonRequired)).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("sends the explanation to the manager", () => {
    const onConfirm = vi.fn();
    render(
      <IncompleteTaskSendDialog open onClose={vi.fn()} onConfirm={onConfirm} />,
    );
    fireEvent.change(screen.getByLabelText(he.incompleteTaskReasonLabel), {
      target: { value: "אין מה לצלם" },
    });
    fireEvent.click(screen.getByRole("button", { name: he.incompleteTaskSendAnyway }));
    expect(onConfirm).toHaveBeenCalledWith("אין מה לצלם");
  });
});
