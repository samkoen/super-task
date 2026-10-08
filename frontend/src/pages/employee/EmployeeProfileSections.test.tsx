import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  ProfileDetailsCard,
  ProfileHero,
  ProfilePasswordCard,
  type PasswordFormValue,
} from "./EmployeeProfileSections";
import { he } from "../../i18n/he";

const form = {
  first_name: "דנה",
  last_name: "כהן",
  email: "d@x.co",
  phone: "050",
  preferred_language: "he" as const,
};

const emptyPassword: PasswordFormValue = {
  current_password: "",
  new_password: "",
  confirm_password: "",
};

describe("ProfileHero", () => {
  it("shows the name, slogan and the edit-photo shortcut", () => {
    const onEditPhoto = vi.fn();
    render(<ProfileHero name="דנה כהן" slogan="תמיד מחייכת" onEditPhoto={onEditPhoto} />);
    expect(screen.getByRole("heading", { name: "דנה כהן" })).toBeTruthy();
    expect(screen.getByText("תמיד מחייכת")).toBeTruthy();
    expect(screen.getByText(he.profileHeroHint)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: he.employeeChangePhoto }));
    expect(onEditPhoto).toHaveBeenCalledTimes(1);
  });

  it("omits the slogan line when there is none", () => {
    render(<ProfileHero name="דנה כהן" onEditPhoto={vi.fn()} />);
    expect(screen.queryByText("תמיד מחייכת")).toBeNull();
  });
});

describe("ProfileDetailsCard", () => {
  it("propagates edits and triggers save", () => {
    const onChange = vi.fn();
    const onSave = vi.fn();
    render(<ProfileDetailsCard form={form} saving={false} onChange={onChange} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText(new RegExp(he.firstName)), { target: { value: "יעל" } });
    expect(onChange).toHaveBeenCalledWith({ ...form, first_name: "יעל" });
    fireEvent.click(screen.getByRole("button", { name: he.saveProfile }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("disables saving while a request is running", () => {
    render(<ProfileDetailsCard form={form} saving onChange={vi.fn()} onSave={vi.fn()} />);
    const buttons = screen.getAllByRole("button") as HTMLButtonElement[];
    expect(buttons.some((b) => b.disabled)).toBe(true);
  });
});

describe("ProfilePasswordCard", () => {
  it("keeps the password fields hidden until the row is opened", () => {
    render(<ProfilePasswordCard value={emptyPassword} saving={false} onChange={vi.fn()} onSave={vi.fn()} />);
    expect(screen.queryByLabelText(new RegExp(he.currentPassword))).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: he.changePassword }));
    expect(screen.getByLabelText(new RegExp(he.currentPassword))).toBeTruthy();
  });

  it("warns when the confirmation does not match", () => {
    render(
      <ProfilePasswordCard
        value={{ current_password: "a", new_password: "abc123", confirm_password: "zzz" }}
        saving={false}
        onChange={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: he.changePassword }));
    expect(screen.getByText(he.passwordMismatch)).toBeTruthy();
  });

  it("does not warn when the new password is still empty", () => {
    render(<ProfilePasswordCard value={emptyPassword} saving={false} onChange={vi.fn()} onSave={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: he.changePassword }));
    expect(screen.queryByText(he.passwordMismatch)).toBeNull();
  });
});
