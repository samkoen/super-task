import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  managerBottomContentPadCss,
  managerFabBottomCss,
  managerNewTaskNavigation,
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

  it("keeps current snif on the new-task path", () => {
    store.set(MANAGER_SCOPE_BRANCH_STORAGE_KEY, "snif-1");
    expect(managerNewTaskNavigation()).toEqual({
      pathname: "/manager/tasks?branch=snif-1",
      state: { openNewTask: true },
    });
  });

  it("keeps content and floating buttons above the pill, safe-area included", () => {
    expect(managerBottomContentPadCss()).toContain("env(safe-area-inset-bottom");
    expect(managerBottomContentPadCss()).toContain("--app-nav-bottom");
    expect(managerBottomContentPadCss()).toContain("95px");
    expect(managerFabBottomCss()).toContain("83px");
    expect(managerFabBottomCss()).toContain("--app-nav-bottom");
  });
});
