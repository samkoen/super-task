import { describe, expect, it } from "vitest";
import type { User } from "../services/api";
import { employeeChromeMenuFlags } from "./employeeChromeMenu";

function user(overrides: Partial<User>): User {
  return {
    id: "u1",
    email: "a@b.c",
    first_name: "א",
    last_name: "ב",
    full_name: "א ב",
    role: "employee",
    phone: null,
    is_active: true,
    ...overrides,
  } as User;
}

describe("employeeChromeMenuFlags", () => {
  it("keeps a regular oved menu to account and logout only", () => {
    expect(employeeChromeMenuFlags(user({ role: "employee" }))).toEqual({
      showExitViewAs: false,
      showViewAsEmployee: false,
      showManagerArea: false,
    });
  });

  it("lets a branch manager switch to view-as and manager area", () => {
    expect(employeeChromeMenuFlags(user({ role: "branch_manager" }))).toEqual({
      showExitViewAs: false,
      showViewAsEmployee: true,
      showManagerArea: true,
    });
  });

  it("shows only exit when previewing as an oved", () => {
    expect(
      employeeChromeMenuFlags(user({ role: "employee", is_preview: true })),
    ).toEqual({
      showExitViewAs: true,
      showViewAsEmployee: false,
      showManagerArea: false,
    });
  });
});
