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

  it("lets the oved leave the end door back to remaining tasks", () => {
    const onBack = vi.fn();
    render(
      <EmployeePunchDoor kind="end" name="דני עובד" remainingCount={2} onOpen={vi.fn()} onBack={onBack} />,
    );
    expect(screen.getByText(he.punchClockOut)).toBeTruthy();
    expect(screen.getByText(he.punchRemainingHint(2))).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: he.punchBackToTasks }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
