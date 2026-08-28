import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import EmployeeShiftHeader from "./EmployeeShiftHeader";
import { he } from "../../i18n/he";

describe("EmployeeShiftHeader", () => {
  it("shows date above a large name and avatar initials", () => {
    const onToggleBreak = vi.fn();
    render(
      <EmployeeShiftHeader
        dateLabel="יום שלישי, 25 באוגוסט 2026"
        name="אחמד קאטוש"
        meta={`${he.branch}: מרכז`}
        onShift
        onBreak={false}
        progress={40}
        onToggleBreak={onToggleBreak}
      />,
    );
    expect(screen.getByText("יום שלישי, 25 באוגוסט 2026")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "אחמד קאטוש" })).toBeTruthy();
    expect(screen.getByText("אק")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: he.employeeBreakStart }));
    expect(onToggleBreak).toHaveBeenCalledTimes(1);
  });

  it("uses the end-break tooltip while on break", () => {
    render(
      <EmployeeShiftHeader
        name="אחמד קאטוש"
        onShift
        onBreak
        onToggleBreak={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: he.employeeBreakEnd })).toBeTruthy();
    expect(screen.queryByRole("button", { name: he.employeeBreakStart })).toBeNull();
  });

  it("shows the camera badge even without a photo", () => {
    render(
      <EmployeeShiftHeader
        name="מונאדל מונאדל"
        photoEditable
        onEditPhoto={vi.fn()}
        onShift
        onBreak={false}
        onToggleBreak={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: he.employeeChangePhoto })).toBeTruthy();
  });

  it("shows the excellence slogan under the name", () => {
    render(
      <EmployeeShiftHeader
        name="מרדכי ייגר"
        slogan="מצוינות כל יום"
        onShift
        onBreak={false}
        onToggleBreak={vi.fn()}
      />,
    );
    expect(screen.getByText("מצוינות כל יום")).toBeTruthy();
  });
});
