import { describe, expect, it } from "vitest";
import { employeeTaskAlertPath, taskIdFromSearch } from "./notificationNavigation";

describe("notificationNavigation", () => {
  it("builds the employee task alert path", () => {
    expect(employeeTaskAlertPath("occ-1")).toBe("/employee?task=occ-1");
  });

  it("reads the task id from the query string", () => {
    expect(taskIdFromSearch("?task=occ-1")).toBe("occ-1");
    expect(taskIdFromSearch("task=occ-1")).toBe("occ-1");
    expect(taskIdFromSearch("")).toBeNull();
    expect(taskIdFromSearch("?other=1")).toBeNull();
  });
});
