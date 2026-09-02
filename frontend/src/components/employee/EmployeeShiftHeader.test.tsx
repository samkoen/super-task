import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import EmployeeShiftHeader, { employeeShiftHeaderPaperSx } from "./EmployeeShiftHeader";
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
    expect(screen.getByRole("button", { name: he.employeeBreakStart }).textContent).toContain(
      he.employeeBreakStart,
    );
    fireEvent.click(screen.getByRole("button", { name: he.employeeBreakStart }));
    expect(onToggleBreak).toHaveBeenCalledTimes(1);
  });

  it("uses the end-break label while on break", () => {
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

  it("shows delete on the avatar when a photo is present", () => {
    const onDeletePhoto = vi.fn();
    render(
      <EmployeeShiftHeader
        name="מונאדל מונאדל"
        photoUrl="/uploads/avatars/a.jpg"
        photoEditable
        onEditPhoto={vi.fn()}
        onDeletePhoto={onDeletePhoto}
        onShift
        onBreak={false}
        onToggleBreak={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: he.employeeDeletePhoto }));
    expect(onDeletePhoto).toHaveBeenCalledTimes(1);
  });

  it("stacks identity above break controls on a phone", () => {
    expect(employeeShiftHeaderPaperSx.flexDirection).toEqual({ xs: "column", sm: "row" });
    const onToggleBreak = vi.fn();
    render(
      <EmployeeShiftHeader
        name="מולוד קאטוש"
        meta={`${he.branch}: שפע רבי עקיבא · סדרנים`}
        onShift={false}
        onBreak={false}
        onToggleBreak={onToggleBreak}
      />,
    );
    const heading = screen.getByRole("heading", { name: "מולוד קאטוש" });
    const meta = screen.getByText(`${he.branch}: שפע רבי עקיבא · סדרנים`);
    const breakBtn = screen.getByRole("button", { name: he.employeeBreakStart });
    expect(heading.compareDocumentPosition(meta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(meta.compareDocumentPosition(breakBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
