import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  MANAGER_SCOPE_BRANCH_STORAGE_KEY,
  parseBranchFromSearch,
  readManagerScopeBranchId,
  withManagerBranchQuery,
  writeManagerScopeBranchId,
} from "./managerScopeBranch";

describe("managerScopeBranch", () => {
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

  it("persists and reads scope branch", () => {
    writeManagerScopeBranchId("b-1");
    expect(readManagerScopeBranchId()).toBe("b-1");
    expect(store.get(MANAGER_SCOPE_BRANCH_STORAGE_KEY)).toBe("b-1");
    writeManagerScopeBranchId("");
    expect(readManagerScopeBranchId()).toBe("");
  });

  it("appends branch query from explicit id or storage", () => {
    expect(withManagerBranchQuery("/manager/tasks", "b9")).toBe("/manager/tasks?branch=b9");
    expect(withManagerBranchQuery("/manager/tasks?status=overdue", "b9")).toBe(
      "/manager/tasks?status=overdue&branch=b9",
    );
    writeManagerScopeBranchId("stored");
    expect(withManagerBranchQuery("/manager/gallery")).toBe("/manager/gallery?branch=stored");
  });

  it("parses branch from search", () => {
    expect(parseBranchFromSearch("?branch=abc")).toBe("abc");
    expect(parseBranchFromSearch(new URLSearchParams("branch=xyz"))).toBe("xyz");
  });
});
