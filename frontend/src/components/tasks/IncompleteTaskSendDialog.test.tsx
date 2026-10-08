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

  it("lets the oved go back with the X or the cancel button", () => {
    const onClose = vi.fn();
    render(<IncompleteTaskSendDialog open onClose={onClose} onConfirm={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: he.close }));
    fireEvent.click(screen.getByRole("button", { name: he.cancel }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("cannot be closed while the task is being sent", () => {
    const onClose = vi.fn();
    render(<IncompleteTaskSendDialog open saving onClose={onClose} onConfirm={vi.fn()} />);
    expect((screen.getByRole("button", { name: he.close }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: he.cancel }));
    expect(onClose).not.toHaveBeenCalled();
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
