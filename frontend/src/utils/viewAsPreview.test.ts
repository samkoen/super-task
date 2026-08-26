import { describe, expect, it } from "vitest";
import {
  canPickForViewAs,
  isViewAsPreview,
  viewAsEmployeeName,
  viewAsLandingPath,
} from "./viewAsPreview";
import type { User } from "../services/api";

const employee = {
  id: "e1",
  full_name: "  דני עובד  ",
  is_preview: true,
} as User;

describe("viewAsPreview", () => {
  it("detects preview mode", () => {
    expect(isViewAsPreview(employee)).toBe(true);
    expect(isViewAsPreview({ ...employee, is_preview: false })).toBe(false);
    expect(isViewAsPreview(null)).toBe(false);
  });

  it("trims the employee name", () => {
    expect(viewAsEmployeeName(employee)).toBe("דני עובד");
    expect(viewAsEmployeeName(null)).toBe("");
  });

  it("lists active ovdim and snif menahelim", () => {
    expect(canPickForViewAs({ is_active: true, role: "employee" })).toBe(true);
    expect(canPickForViewAs({ is_active: true, role: "branch_manager" })).toBe(true);
    expect(canPickForViewAs({ is_active: false, role: "employee" })).toBe(false);
    expect(canPickForViewAs({ is_active: true, role: "network_manager" })).toBe(false);
  });

  it("opens the oved dashboard in preview", () => {
    expect(viewAsLandingPath("employee")).toBe("/employee");
    expect(viewAsLandingPath("branch_manager")).toBe("/employee");
    expect(viewAsLandingPath("network_manager")).toBe("/");
  });
});
