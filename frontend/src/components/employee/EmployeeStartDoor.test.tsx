import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import EmployeeStartDoor from "./EmployeeStartDoor";
import { he } from "../../i18n/he";

function atHour(hour: number) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 15, hour, 28, 0));
}

describe("EmployeeStartDoor (FLOW 1 · 01)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("greets the first name, asks if ready, shows the branch tag and the auto clock-in note", () => {
    atHour(7);
    render(<EmployeeStartDoor name="אבי כהן" branch="510" onOpen={vi.fn()} />);
    expect(screen.getByTestId("start-door-greeting").textContent).toBe("בוקר טוב, אבי!");
    expect(screen.getByText(he.flowStartReady)).toBeTruthy();
    expect(screen.getByTestId("start-door-branch").textContent).toBe("סניף 510");
    expect(screen.getByText(he.flowStartCta)).toBeTruthy();
    expect(screen.getByText(he.flowStartAutoTime)).toBeTruthy();
  });

  it("adapts the greeting to the hour of the shift", () => {
    atHour(14);
    render(<EmployeeStartDoor name="אבי" onOpen={vi.fn()} />);
    expect(screen.getByTestId("start-door-greeting").textContent).toBe(`${he.employeeGreetingNoon}, אבי!`);
  });

  it("omits the branch tag and the name when they are unknown", () => {
    atHour(7);
    render(<EmployeeStartDoor onOpen={vi.fn()} />);
    expect(screen.queryByTestId("start-door-branch")).toBeNull();
    expect(screen.getByTestId("start-door-greeting").textContent).toBe("בוקר טוב!");
  });

  it("calls onOpen once when the big button is pressed", () => {
    const onOpen = vi.fn();
    render(<EmployeeStartDoor name="דני" onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: he.punchOpenShift }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
