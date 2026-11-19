import { describe, expect, it } from "vitest";
import { SIDEBAR_WIDTH } from "../../constants/layout";
import {
  systemBugLauncherBottom,
  systemBugLauncherLeft,
  systemBugLauncherSide,
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

  it("sits above the manager bottom pill", () => {
    expect(systemBugLauncherBottom(true)).toContain("83px");
    expect(systemBugLauncherBottom(false)).toContain("16px");
  });

  it("sits above the oved bottom nav", () => {
    expect(systemBugLauncherBottom(false, true)).toContain("84px");
  });

  it("moves to the right above the oved nav to free the chat FAB corner", () => {
    expect(systemBugLauncherSide(false, true)).toEqual({ right: 8 });
    expect(systemBugLauncherSide(false, false)).toEqual({ left: 8 });
  });
});
