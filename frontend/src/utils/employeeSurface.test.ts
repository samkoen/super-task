import { describe, expect, it } from "vitest";
import { canAccessEmployeeDashboard, usesEmployeeChrome } from "./employeeSurface";

describe("employeeSurface", () => {
  it("lets branch managers open the oved dashboard", () => {
    expect(canAccessEmployeeDashboard("employee")).toBe(true);
    expect(canAccessEmployeeDashboard("branch_manager")).toBe(true);
    expect(canAccessEmployeeDashboard("network_manager")).toBe(false);
    expect(canAccessEmployeeDashboard("admin")).toBe(false);
  });

  it("uses oved chrome on /employee for dual-hat menahel", () => {
    expect(usesEmployeeChrome("employee", "/manager")).toBe(true);
    expect(usesEmployeeChrome("branch_manager", "/employee")).toBe(true);
    expect(usesEmployeeChrome("branch_manager", "/manager")).toBe(false);
    expect(usesEmployeeChrome("network_manager", "/employee")).toBe(false);
  });
});
