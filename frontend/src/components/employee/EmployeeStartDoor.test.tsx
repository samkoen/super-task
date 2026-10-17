import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import EmployeeStartDoor from "./EmployeeStartDoor";
import { useBranchWeather } from "../../hooks/useBranchWeather";
import { he } from "../../i18n/he";

vi.mock("../../hooks/useBranchWeather", () => ({ useBranchWeather: vi.fn() }));

const weatherMock = vi.mocked(useBranchWeather);

describe("EmployeeStartDoor", () => {
  beforeEach(() => {
    weatherMock.mockReturnValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows name, date, branch once, title, instruction and the clock", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 15, 7, 28, 0));
    render(
      <EmployeeStartDoor
        name="דני עובד"
        dateLabel="יום חמישי, 15 באוקטובר"
        meta="סניף: שפע · עובד"
        onOpen={vi.fn()}
      />,
    );
    const identity = within(screen.getByTestId("start-door-identity"));
    expect(identity.getByText("דני עובד")).toBeTruthy();
    expect(identity.getByText("יום חמישי, 15 באוקטובר")).toBeTruthy();
    expect(screen.getAllByText("סניף: שפע · עובד")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: he.punchOpenShift })).toBeTruthy();
    expect(screen.getByText(he.punchOpenShiftHint)).toBeTruthy();
    expect(screen.getByText("07:28")).toBeTruthy();
  });

  it("falls back to initials and omits empty date and branch lines", () => {
    render(<EmployeeStartDoor name="דני עובד" onOpen={vi.fn()} />);
    const identity = within(screen.getByTestId("start-door-identity"));
    expect(identity.getByText("דע")).toBeTruthy();
    expect(identity.queryByText(/סניף/)).toBeNull();
  });

  it("calls onOpen when the button is pressed and has a blinking ring", () => {
    const onOpen = vi.fn();
    render(<EmployeeStartDoor name="דני" onOpen={onOpen} />);
    expect(screen.getByTestId("start-door-ring")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: he.punchOpenShift }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("offers no chats shortcut (it lives in the burger menu)", () => {
    render(<EmployeeStartDoor name="דני" onOpen={vi.fn()} />);
    expect(screen.queryByRole("button", { name: he.directChatTitle })).toBeNull();
  });

  it("uses Jerusalem and a clock-based sky when the weather is unavailable", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 15, 22, 0, 0));
    render(<EmployeeStartDoor name="דני" onOpen={vi.fn()} />);
    expect(screen.getByTestId("start-door-place").textContent).toBe("ירושלים");
    expect(screen.getByTestId("start-door-hero").getAttribute("data-scene")).toBe("clear-night");
    expect(screen.queryByTestId("start-door-temp")).toBeNull();
  });

  it("shows the branch city, temperature and the scene matching the weather", () => {
    weatherMock.mockReturnValue({ temperatureC: 17.6, code: 63, isDay: true, place: "חיפה" });
    render(<EmployeeStartDoor name="דני" branchCity="חיפה" onOpen={vi.fn()} />);
    expect(weatherMock).toHaveBeenCalledWith("חיפה");
    expect(screen.getByTestId("start-door-place").textContent).toBe("חיפה");
    expect(screen.getByTestId("start-door-temp").textContent).toBe("18°");
    expect(screen.getByTestId("start-door-hero").getAttribute("data-scene")).toBe("rain");
    expect(screen.getByText(he.weatherScene.rain)).toBeTruthy();
  });
});
