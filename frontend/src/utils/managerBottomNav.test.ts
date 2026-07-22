import { describe, expect, it } from "vitest";
import {
  managerNewTaskNavigation,
  resolveManagerBottomTab,
  shouldShowManagerChrome,
} from "./managerBottomNav";

describe("managerBottomNav", () => {
  it("resolves active tab from path", () => {
    expect(resolveManagerBottomTab("/manager")).toBe("home");
    expect(resolveManagerBottomTab("/manager/")).toBe("home");
    expect(resolveManagerBottomTab("/manager/tasks")).toBe("tasks");
    expect(resolveManagerBottomTab("/manager/gallery")).toBe("archive");
    expect(resolveManagerBottomTab("/manager/employees")).toBeNull();
    expect(resolveManagerBottomTab("/employee")).toBeNull();
  });

  it("shows chrome only for branch/network managers", () => {
    expect(shouldShowManagerChrome("branch_manager")).toBe(true);
    expect(shouldShowManagerChrome("network_manager")).toBe(true);
    expect(shouldShowManagerChrome("admin")).toBe(false);
    expect(shouldShowManagerChrome("employee")).toBe(false);
  });

  it("opens new task via tasks page state", () => {
    expect(managerNewTaskNavigation()).toEqual({
      pathname: "/manager/tasks",
      state: { openNewTask: true },
    });
  });
});
