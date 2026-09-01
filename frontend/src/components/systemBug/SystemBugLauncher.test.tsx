import { describe, expect, it } from "vitest";
import { systemBugLauncherSx } from "./SystemBugLauncher";

describe("SystemBugLauncher", () => {
  it("stays a tiny corner control", () => {
    expect(systemBugLauncherSx.position).toBe("fixed");
    expect(systemBugLauncherSx.width).toBe(26);
    expect(systemBugLauncherSx.opacity).toBe(0.2);
  });
});
