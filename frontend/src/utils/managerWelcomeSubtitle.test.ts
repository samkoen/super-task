import { describe, expect, it } from "vitest";
import { he } from "../i18n/he";
import { managerDashboardMeta, managerWelcomeSubtitle } from "./managerWelcomeSubtitle";

describe("managerDashboardMeta", () => {
  it("joins branch and role like the oved header meta", () => {
    expect(
      managerDashboardMeta({
        branchName: "שפע",
        networkName: "רשת עלי",
        role: "branch_manager",
      }),
    ).toBe(`${he.branch}: שפע · ${he.roleBranchManager}`);
  });

  it("uses the network name when no branch is selected", () => {
    expect(
      managerDashboardMeta({ networkName: "רשת עלי", role: "network_manager" }),
    ).toBe(`רשת עלי · ${he.roleNetworkManager}`);
  });
});

describe("managerWelcomeSubtitle", () => {
  it("returns welcome with network in parentheses", () => {
    expect(managerWelcomeSubtitle("דני כהן", "רשת עלי")).toBe("שלום, דני כהן (רשת עלי)");
  });

  it("omits parentheses when no network", () => {
    expect(managerWelcomeSubtitle("דני כהן", null)).toBe("שלום, דני כהן");
    expect(managerWelcomeSubtitle("דני כהן", "  ")).toBe("שלום, דני כהן");
  });

  it("returns undefined without name", () => {
    expect(managerWelcomeSubtitle("", "רשת")).toBeUndefined();
    expect(managerWelcomeSubtitle(null)).toBeUndefined();
  });
});
