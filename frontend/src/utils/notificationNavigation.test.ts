import { describe, expect, it } from "vitest";
import {
  employeeTaskAlertPath,
  shouldOpenEmployeeTaskAlert,
  taskIdFromSearch,
} from "./notificationNavigation";

describe("notificationNavigation", () => {
  it("builds the employee task alert path", () => {
    expect(employeeTaskAlertPath("occ-1")).toBe("/employee?task=occ-1");
  });

  it("opens task alerts for oved and dual-hat menahel", () => {
    expect(shouldOpenEmployeeTaskAlert("employee")).toBe(true);
    expect(shouldOpenEmployeeTaskAlert("branch_manager")).toBe(true);
    expect(shouldOpenEmployeeTaskAlert("network_manager")).toBe(false);
  });

  it("reads the task id from the query string", () => {
    expect(taskIdFromSearch("?task=occ-1")).toBe("occ-1");
    expect(taskIdFromSearch("task=occ-1")).toBe("occ-1");
    expect(taskIdFromSearch("")).toBeNull();
    expect(taskIdFromSearch("?other=1")).toBeNull();
  });
});
