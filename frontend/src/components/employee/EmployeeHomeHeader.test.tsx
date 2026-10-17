import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import EmployeeHomeHeader from "./EmployeeHomeHeader";
import { useBranchWeather } from "../../hooks/useBranchWeather";
import { he } from "../../i18n/he";

vi.mock("../../hooks/useBranchWeather", () => ({ useBranchWeather: vi.fn() }));

const weatherMock = vi.mocked(useBranchWeather);

describe("EmployeeHomeHeader", () => {
  beforeEach(() => {
    weatherMock.mockReturnValue(null);
  });

  it("shows the branch sky with place and temperature, like the start door", () => {
    weatherMock.mockReturnValue({ temperatureC: 17.6, code: 63, isDay: true, place: "חיפה" });
    render(<EmployeeHomeHeader name="דני עובד" branchCity="חיפה" />);
    expect(weatherMock).toHaveBeenCalledWith("חיפה");
    expect(screen.getByTestId("start-door-place").textContent).toBe("חיפה");
    expect(screen.getByTestId("start-door-temp").textContent).toBe("18°");
    expect(screen.getByTestId("start-door-hero").getAttribute("data-scene")).toBe("rain");
  });

  it("falls back to Jerusalem and omits empty lines", () => {
    render(<EmployeeHomeHeader name="דני עובד" />);
    expect(screen.getByTestId("start-door-place").textContent).toBe("ירושלים");
    expect(screen.queryByTestId("start-door-temp")).toBeNull();
    expect(screen.queryByText(/סניף/)).toBeNull();
    expect(screen.queryByRole("button", { name: he.employeeBreakStart })).toBeNull();
  });

  it("shows identity, status, progress and toggles the break", () => {
    const onToggleBreak = vi.fn();
    render(
      <EmployeeHomeHeader
        name="דני עובד"
        dateLabel="יום חמישי, 15 באוקטובר"
        meta="סניף: שפע · עובד"
        onShift
        progress={25}
        completedCount={1}
        totalCount={4}
        onToggleBreak={onToggleBreak}
      />,
    );
    expect(screen.getByRole("heading", { name: "דני עובד" })).toBeTruthy();
    expect(screen.getByText("יום חמישי, 15 באוקטובר")).toBeTruthy();
    expect(screen.getAllByText("סניף: שפע · עובד")).toHaveLength(1);
    expect(screen.getByText(he.employeeOnShift)).toBeTruthy();
    expect(screen.getByText("25%")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: he.employeeBreakStart }));
    expect(onToggleBreak).toHaveBeenCalledTimes(1);
  });

  it("offers to end the break while on break", () => {
    render(<EmployeeHomeHeader name="דני" onBreak onToggleBreak={vi.fn()} />);
    expect(screen.getByText(he.employeeOnBreak)).toBeTruthy();
    expect(screen.getByRole("button", { name: he.employeeBreakEnd })).toBeTruthy();
  });
});
