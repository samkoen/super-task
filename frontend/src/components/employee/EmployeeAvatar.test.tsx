import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import EmployeeAvatar from "./EmployeeAvatar";
import { he } from "../../i18n/he";

describe("EmployeeAvatar", () => {
  it("shows the camera badge on the avatar when editable", () => {
    const onEdit = vi.fn();
    render(<EmployeeAvatar name="דנה לוי" editable onEdit={onEdit} />);
    const button = screen.getByRole("button", { name: he.employeeChangePhoto });
    expect(button).toBeTruthy();
    fireEvent.click(button);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("hides the camera badge when not editable", () => {
    render(<EmployeeAvatar name="דנה לוי" />);
    expect(screen.queryByRole("button", { name: he.employeeChangePhoto })).toBeNull();
  });
});
