import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MANAGER_TABS,
  isManagerTabRoot,
  managerCreateNavigation,
  managerMoreItems,
  managerMorePath,
  managerTabPath,
  resolveManagerTab,
  resolveManagerTasksView,
} from "./managerShell";
import { MANAGER_SCOPE_BRANCH_STORAGE_KEY } from "./managerScopeBranch";

describe("managerShell", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("keeps the Figma pill order: docs, team, chat, home", () => {
    expect(MANAGER_TABS.map((t) => t.tab)).toEqual(["tasks", "team", "chats", "home"]);
  });

  it("puts every task page under the tasks tab", () => {
    expect(resolveManagerTab("/manager")).toBe("home");
    expect(resolveManagerTab("/manager/")).toBe("home");
    expect(resolveManagerTab("/manager/tasks")).toBe("tasks");
    expect(resolveManagerTab("/manager/fixed-tasks/abc")).toBe("tasks");
    expect(resolveManagerTab("/manager/gallery")).toBe("tasks");
    expect(resolveManagerTab("/manager/issues")).toBe("tasks");
    expect(resolveManagerTab("/manager/employees")).toBe("team");
    expect(resolveManagerTab("/manager/invitations")).toBe("team");
    expect(resolveManagerTab("/manager/chats")).toBe("chats");
  });

  it("leaves pages of the more sheet without an active tab", () => {
    expect(resolveManagerTab("/manager/reports")).toBeNull();
    expect(resolveManagerTab("/manager/settings")).toBeNull();
    expect(resolveManagerTab("/manager/tasksx")).toBeNull();
    expect(resolveManagerTab("/employee")).toBeNull();
  });

  it("keeps the current snif when switching tab", () => {
    expect(managerTabPath("team")).toBe("/manager/employees");
    store.set(MANAGER_SCOPE_BRANCH_STORAGE_KEY, "b7");
    expect(managerTabPath("home")).toBe("/manager?branch=b7");
    expect(managerTabPath("tasks", "b9")).toBe("/manager/tasks?branch=b9");
  });

  it("shows the tasks views switch only on the three list pages", () => {
    expect(resolveManagerTasksView("/manager/tasks")).toBe("today");
    expect(resolveManagerTasksView("/manager/fixed-tasks/")).toBe("fixed");
    expect(resolveManagerTasksView("/manager/gallery")).toBe("library");
    expect(resolveManagerTasksView("/manager/fixed-tasks/new")).toBeNull();
    expect(resolveManagerTasksView("/manager")).toBeNull();
  });

  it("hides the back button only on tab roots", () => {
    expect(isManagerTabRoot("/manager")).toBe(true);
    expect(isManagerTabRoot("/manager/gallery")).toBe(true);
    expect(isManagerTabRoot("/manager/chats")).toBe(true);
    expect(isManagerTabRoot("/manager/reports")).toBe(false);
    expect(isManagerTabRoot("/manager/fixed-tasks/abc")).toBe(false);
  });

  it("builds the more sheet by role, without departments or products", () => {
    expect(managerMoreItems("branch_manager", false)).toEqual(["myTasks", "reports", "invitations", "settings", "account"]);
    expect(managerMoreItems("network_manager", true)).toEqual([
      "reports", "branches", "invitations", "settings", "account", "systemBugs",
    ]);
    expect(managerMorePath("myTasks")).toBe("/employee");
    expect(managerMorePath("systemBugs")).toBe("/system-bugs");
  });

  it("routes each create choice to the existing screens", () => {
    expect(managerCreateNavigation("adHoc", "")).toEqual({ pathname: "/manager/tasks", state: { openNewTask: true } });
    expect(managerCreateNavigation("library", "b1")).toEqual({
      pathname: "/manager/tasks?branch=b1",
      state: { openGalleryTask: true },
    });
    expect(managerCreateNavigation("fixed")).toEqual({ pathname: "/manager/fixed-tasks/new" });
  });
});
