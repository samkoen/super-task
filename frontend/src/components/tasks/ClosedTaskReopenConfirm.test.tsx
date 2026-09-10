import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ClosedTaskReopenConfirm from "./ClosedTaskReopenConfirm";
import { he } from "../../i18n/he";

describe("ClosedTaskReopenConfirm", () => {
  it("asks for a short confirmation before reopen", () => {
    const onConfirm = vi.fn();
    render(
      <ClosedTaskReopenConfirm open saving={false} onCancel={vi.fn()} onConfirm={onConfirm} />,
    );
    expect(screen.getByText(he.taskReopenClosedConfirm)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: he.taskReopenClosed }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("renders nothing useful when closed", () => {
    render(
      <ClosedTaskReopenConfirm open={false} saving={false} onCancel={vi.fn()} onConfirm={vi.fn()} />,
    );
    expect(screen.queryByText(he.taskReopenClosedConfirm)).toBeNull();
  });
});
