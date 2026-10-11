import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import EmployeePunchDoor from "./EmployeePunchDoor";
import { he } from "../../i18n/he";

describe("EmployeePunchDoor", () => {
  it("opens the start task from the fingerprint avatar", () => {
    const onOpen = vi.fn();
    render(<EmployeePunchDoor kind="start" name="דני עובד" taskTitle="פתיחת משמרת" onOpen={onOpen} />);
    expect(screen.getByText(he.punchClockIn)).toBeTruthy();
    expect(screen.getByText("פתיחת משמרת")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: he.punchClockIn }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: he.punchBackToTasks })).toBeNull();
  });

  it("shows the exit screen without a way back to the task list", () => {
    render(<EmployeePunchDoor kind="end" name="דני עובד" onOpen={vi.fn()} />);
    expect(screen.getByText(he.punchClockOut)).toBeTruthy();
    expect(screen.queryByRole("button", { name: he.punchBackToTasks })).toBeNull();
  });
});
