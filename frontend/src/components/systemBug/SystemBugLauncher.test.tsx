import { describe, expect, it } from "vitest";
import { SIDEBAR_WIDTH } from "../../constants/layout";
import {
  systemBugLauncherBottom,
  systemBugLauncherLeft,
  systemBugLauncherSx,
} from "./SystemBugLauncher";

describe("SystemBugLauncher", () => {
  it("stays a small visible corner control", () => {
    expect(systemBugLauncherSx.position).toBe("fixed");
    expect(systemBugLauncherSx.width).toBe(36);
    expect(systemBugLauncherSx.opacity).toBe(0.85);
    expect(systemBugLauncherSx.zIndex).toBe(1400);
  });

  it("sits past the desktop sidebar, not under it", () => {
    expect(systemBugLauncherLeft(false)).toBe(8);
    expect(systemBugLauncherLeft(true)).toEqual({ xs: 8, sm: SIDEBAR_WIDTH + 8 });
  });

  it("sits above the manager bottom nav", () => {
    expect(systemBugLauncherBottom(true)).toContain("76px");
    expect(systemBugLauncherBottom(false)).toContain("16px");
  });
});
