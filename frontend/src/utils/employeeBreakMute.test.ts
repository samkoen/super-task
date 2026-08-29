import { describe, expect, it } from "vitest";
import { shouldDeliverEmployeeAlert } from "./employeeBreakMute";

describe("shouldDeliverEmployeeAlert", () => {
  it("delivers every alert when the oved is not on break", () => {
    expect(shouldDeliverEmployeeAlert(false, "task_created")).toBe(true);
    expect(shouldDeliverEmployeeAlert(false, "direct_message")).toBe(true);
  });

  it("mutes ordinary alerts during a break and keeps the emergency ring", () => {
    expect(shouldDeliverEmployeeAlert(true, "task_created")).toBe(false);
    expect(shouldDeliverEmployeeAlert(true, "direct_message")).toBe(false);
    expect(shouldDeliverEmployeeAlert(true, undefined)).toBe(false);
    expect(shouldDeliverEmployeeAlert(true, "break_override")).toBe(true);
  });
});
