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
    expect(screen.queryByRole("menuitem")).toBeNull();
  });

  it("hides the camera badge when not editable", () => {
    render(<EmployeeAvatar name="דנה לוי" />);
    expect(screen.queryByRole("button", { name: he.employeeChangePhoto })).toBeNull();
  });

  it("opens a menu to delete instead of a second badge", () => {
    const onDelete = vi.fn();
    render(
      <EmployeeAvatar
        name="דנה לוי"
        photoUrl="/uploads/avatars/a.jpg"
        editable
        onEdit={vi.fn()}
        onDelete={onDelete}
      />,
    );
    expect(screen.queryByRole("button", { name: he.employeeDeletePhoto })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: he.employeeChangePhoto }));
    fireEvent.click(screen.getByRole("menuitem", { name: he.employeeDeletePhoto }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("opens the same menu when clicking the avatar", () => {
    const onEdit = vi.fn();
    render(
      <EmployeeAvatar
        name="דנה לוי"
        photoUrl="/uploads/avatars/a.jpg"
        editable
        onEdit={onEdit}
        onDelete={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByAltText("דנה לוי"));
    fireEvent.click(screen.getByRole("menuitem", { name: he.employeeChangePhoto }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("hides delete when there is no photo", () => {
    render(<EmployeeAvatar name="דנה לוי" editable onEdit={vi.fn()} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: he.employeeChangePhoto }));
    expect(screen.queryByRole("menuitem", { name: he.employeeDeletePhoto })).toBeNull();
  });
});
