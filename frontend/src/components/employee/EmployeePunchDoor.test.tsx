import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import EmployeePunchDoor from "./EmployeePunchDoor";
import { he } from "../../i18n/he";

vi.mock("../../hooks/useBranchWeather", () => ({ useBranchWeather: () => null }));

describe("EmployeePunchDoor", () => {
  it("opens the start task from the fingerprint button", () => {
    const onOpen = vi.fn();
    render(<EmployeePunchDoor kind="start" name="דני עובד" onOpen={onOpen} />);
    expect(screen.getByText(he.punchOpenShift)).toBeTruthy();
    expect(screen.getByText(he.punchOpenShiftHint)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: he.punchOpenShift }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: he.punchBackToTasks })).toBeNull();
  });

  it("shows the exit screen without a way back to the task list", () => {
    render(<EmployeePunchDoor kind="end" name="דני עובד" onOpen={vi.fn()} />);
    expect(screen.getByText(he.punchClockOut)).toBeTruthy();
    expect(screen.queryByRole("button", { name: he.punchBackToTasks })).toBeNull();
  });
});
