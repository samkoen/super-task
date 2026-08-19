import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import EmployeeDoTaskButton from "./EmployeeDoTaskButton";
import { he } from "../../i18n/he";

describe("EmployeeDoTaskButton", () => {
  it("hides when the task cannot be done in-app yet", () => {
    render(<EmployeeDoTaskButton status="pending_review" onClick={vi.fn()} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("uses do-task then finish labels", () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <EmployeeDoTaskButton status="overdue" onClick={onClick} />,
    );
    fireEvent.click(screen.getByRole("button", { name: he.doTask }));
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(<EmployeeDoTaskButton status="in_progress" onClick={onClick} />);
    expect(screen.getByRole("button", { name: he.markDone })).toBeTruthy();
  });
});
