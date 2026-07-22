import { describe, expect, it } from "vitest";
import { shouldShowAppBack } from "./navigationBack";

describe("shouldShowAppBack", () => {
  it("hides on role home", () => {
    expect(shouldShowAppBack("/manager", "branch_manager")).toBe(false);
    expect(shouldShowAppBack("/employee", "employee")).toBe(false);
    expect(shouldShowAppBack("/admin", "admin")).toBe(false);
  });

  it("shows on nested pages", () => {
    expect(shouldShowAppBack("/manager/tasks", "branch_manager")).toBe(true);
    expect(shouldShowAppBack("/manager/issues", "network_manager")).toBe(true);
    expect(shouldShowAppBack("/admin/users", "admin")).toBe(true);
  });
});
