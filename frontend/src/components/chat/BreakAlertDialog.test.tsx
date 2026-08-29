import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BreakAlertDialog from "./BreakAlertDialog";
import { he } from "../../i18n/he";
import { employeeActivityService } from "../../services/employeeActivityService";
import { formatTime } from "../../utils/dashboardTime";

vi.mock("../../services/employeeActivityService", () => ({
  employeeActivityService: { ring: vi.fn() },
}));

const TARGET = {
  userId: "e1",
  alert: {
    on_break: true,
    on_break_since: "2026-08-28T10:00:00+03:00",
    elapsed_seconds: 900,
  },
};

describe("BreakAlertDialog", () => {
  beforeEach(() => {
    vi.mocked(employeeActivityService.ring).mockReset();
    vi.mocked(employeeActivityService.ring).mockResolvedValue({ ok: true });
  });

  it("shows break start time, elapsed time, and can ring anyway", async () => {
    const onClose = vi.fn();
    render(<BreakAlertDialog target={TARGET} onClose={onClose} />);
    expect(screen.getByText(he.breakAlertTitle)).toBeTruthy();
    expect(screen.getByText(he.breakAlertSince(formatTime(TARGET.alert.on_break_since)))).toBeTruthy();
    expect(screen.getByText(he.breakAlertElapsed("15 דק'"))).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: he.breakAlertRingAnyway }));
    await waitFor(() => {
      expect(employeeActivityService.ring).toHaveBeenCalledWith("e1");
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("keeps the message silent when dismissed", () => {
    const onClose = vi.fn();
    render(<BreakAlertDialog target={TARGET} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: he.breakAlertKeepSilent }));
    expect(onClose).toHaveBeenCalled();
    expect(employeeActivityService.ring).not.toHaveBeenCalled();
  });
});
