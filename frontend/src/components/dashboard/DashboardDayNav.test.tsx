import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DashboardDayNav from "./DashboardDayNav";
import { he } from "../../i18n/he";
import { formatHebrewDay, shiftDay } from "../../utils/dateView";

describe("DashboardDayNav", () => {
  it("moves one day back or forward and accepts a picked date", () => {
    const onChange = vi.fn();
    render(<DashboardDayNav day="2026-09-24" onChange={onChange} />);
    expect(screen.getByText(formatHebrewDay("2026-09-24"))).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: he.tasksPreviousDay }));
    fireEvent.click(screen.getByRole("button", { name: he.tasksNextDay }));
    fireEvent.change(screen.getByLabelText(he.tasksViewDay), { target: { value: "2026-10-01" } });

    expect(onChange).toHaveBeenNthCalledWith(1, shiftDay("2026-09-24", -1));
    expect(onChange).toHaveBeenNthCalledWith(2, shiftDay("2026-09-24", 1));
    expect(onChange).toHaveBeenNthCalledWith(3, "2026-10-01");
    expect(screen.getByRole("button", { name: he.dashboardPickDay })).toBeTruthy();
  });
});
