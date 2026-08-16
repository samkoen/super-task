import { describe, expect, it } from "vitest";
import { userBelongsToBranch, userBranchLabels } from "./userBranchMembership";

describe("userBelongsToBranch", () => {
  it("matches primary branch_id", () => {
    expect(userBelongsToBranch({ branch_id: "b1" }, "b1")).toBe(true);
    expect(userBelongsToBranch({ branch_id: "b1" }, "b2")).toBe(false);
  });

  it("matches secondary membership", () => {
    expect(
      userBelongsToBranch(
        {
          branch_id: "b1",
          branches: [
            { branch_id: "b1", branch_name: "א" },
            { branch_id: "b2", branch_name: "ב" },
          ],
        },
        "b2"
      )
    ).toBe(true);
  });

  it("empty branch filter matches all", () => {
    expect(userBelongsToBranch({ branch_id: "b1" }, "")).toBe(true);
  });
});

describe("userBranchLabels", () => {
  it("returns membership names", () => {
    expect(
      userBranchLabels({
        branch_id: "b1",
        branches: [
          { branch_id: "b1", branch_name: " מרכז " },
          { branch_id: "b2", branch_name: "" },
          { branch_id: "b3", branch_name: "צפון" },
        ],
      })
    ).toEqual(["מרכז", "צפון"]);
  });
});
