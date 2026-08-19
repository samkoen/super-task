import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import EmployeeShiftHeader from "./EmployeeShiftHeader";
import { he } from "../../i18n/he";

describe("EmployeeShiftHeader", () => {
  it("keeps presence as a compact bar with toggle", () => {
    const onToggleBreak = vi.fn();
    render(
      <EmployeeShiftHeader
        name="אחמד קאטוש"
        meta={`${he.branch}: מרכז`}
        onShift
        onBreak={false}
        progress={40}
        onToggleBreak={onToggleBreak}
      />,
    );
    expect(screen.getByText("אחמד קאטוש")).toBeTruthy();
    expect(screen.getByText(he.employeeOnShift)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: he.employeeBreakStart }));
    expect(onToggleBreak).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("heading", { level: 5 })).toBeNull();
  });
});
