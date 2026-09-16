import { describe, expect, it, beforeEach } from "vitest";
import {
  launchedApkUpdateName,
  markApkUpdateLaunched,
  shouldBlockApkUpdate,
} from "./apkUpdateMemory";

describe("apkUpdateMemory", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("does not block until an install was launched", () => {
    expect(shouldBlockApkUpdate("1.2", "")).toBe(true);
    expect(launchedApkUpdateName()).toBe("");
  });

  it("stops blocking the same version after install is launched", () => {
    markApkUpdateLaunched("1.2");
    expect(launchedApkUpdateName()).toBe("1.2");
    expect(shouldBlockApkUpdate("1.2", launchedApkUpdateName())).toBe(false);
  });

  it("blocks again when a newer published version appears", () => {
    markApkUpdateLaunched("1.2");
    expect(shouldBlockApkUpdate("1.3", launchedApkUpdateName())).toBe(true);
  });
});
