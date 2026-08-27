import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  managerBottomContentPadCss,
  managerBottomNavPath,
  managerFabBottomCss,
  managerNewTaskNavigation,
  resolveManagerBottomTab,
  shouldShowManagerChrome,
} from "./managerBottomNav";
import { MANAGER_SCOPE_BRANCH_STORAGE_KEY } from "./managerScopeBranch";

describe("managerBottomNav", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

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
    expect(shouldShowManagerChrome("branch_manager", "/employee")).toBe(false);
    expect(shouldShowManagerChrome("branch_manager", "/manager")).toBe(true);
  });

  it("opens new task via tasks page state", () => {
    expect(managerNewTaskNavigation()).toEqual({
      pathname: "/manager/tasks",
      state: { openNewTask: true },
    });
  });

  it("keeps current snif on bottom nav and new-task paths", () => {
    store.set(MANAGER_SCOPE_BRANCH_STORAGE_KEY, "snif-1");
    expect(managerBottomNavPath("/manager/tasks")).toBe("/manager/tasks?branch=snif-1");
    expect(managerBottomNavPath("/manager/gallery")).toBe("/manager/gallery?branch=snif-1");
    expect(managerNewTaskNavigation()).toEqual({
      pathname: "/manager/tasks?branch=snif-1",
      state: { openNewTask: true },
    });
  });

  it("includes safe-area in bottom chrome spacing css", () => {
    expect(managerBottomContentPadCss()).toContain("env(safe-area-inset-bottom");
    expect(managerBottomContentPadCss()).toContain("--app-nav-bottom");
    expect(managerBottomContentPadCss()).toContain("112px");
    expect(managerFabBottomCss()).toContain("76px");
    expect(managerFabBottomCss()).toContain("--app-nav-bottom");
  });
});
