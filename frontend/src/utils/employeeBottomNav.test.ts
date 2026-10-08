import { describe, expect, it } from "vitest";
import {
  EMPLOYEE_BOTTOM_NAV_ITEMS,
  employeeBottomContentPadCss,
  resolveEmployeeBottomTab,
  shouldShowEmployeeBack,
} from "./employeeBottomNav";

describe("resolveEmployeeBottomTab", () => {
  it("maps the three main oved screens", () => {
    expect(resolveEmployeeBottomTab("/employee")).toBe("tasks");
    expect(resolveEmployeeBottomTab("/employee/")).toBe("tasks");
    expect(resolveEmployeeBottomTab("/employee/chats")).toBe("chats");
    expect(resolveEmployeeBottomTab("/employee/account")).toBe("account");
  });

  it("highlights nothing elsewhere", () => {
    expect(resolveEmployeeBottomTab("/manager")).toBeNull();
    expect(resolveEmployeeBottomTab("/employee/unknown")).toBeNull();
  });

  it("has a route for every tab", () => {
    for (const item of EMPLOYEE_BOTTOM_NAV_ITEMS) {
      expect(resolveEmployeeBottomTab(item.path)).toBe(item.tab);
    }
  });
});

describe("shouldShowEmployeeBack", () => {
  it("hides the back button on the three tabs", () => {
    expect(shouldShowEmployeeBack("/employee/chats", true)).toBe(false);
    expect(shouldShowEmployeeBack("/employee/account", true)).toBe(false);
  });

  it("keeps it on other screens, and never forces it", () => {
    expect(shouldShowEmployeeBack("/employee/other", true)).toBe(true);
    expect(shouldShowEmployeeBack("/employee/other", false)).toBe(false);
  });
});

describe("employeeBottomContentPadCss", () => {
  it("adds the system inset on top of the bar height", () => {
    expect(employeeBottomContentPadCss()).toContain("safe-area-inset-bottom");
  });
});
