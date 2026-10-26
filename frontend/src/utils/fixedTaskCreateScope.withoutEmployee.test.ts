import { describe, expect, it } from "vitest";
import { branchNamesWithoutEmployee } from "./fixedTaskCreateScope";

const branches = [
  { id: "b1", name: "תל אביב" },
  { id: "b2", name: "חיפה" },
  { id: "b3", name: "אילת" },
];

describe("branchNamesWithoutEmployee", () => {
  it("lists only selected branches that have no active employee", () => {
    const employees = [
      { role: "employee", branch_id: "b1", is_active: true },
      { role: "employee", branch_id: "b2", is_active: false },
    ];
    expect(branchNamesWithoutEmployee(branches, ["b1", "b2"], employees)).toEqual(["חיפה"]);
  });

  it("counts membership in several branches", () => {
    const employees = [
      { role: "employee", branch_id: "b1", branches: [{ branch_id: "b3" }] },
    ];
    expect(branchNamesWithoutEmployee(branches, ["b3"], employees)).toEqual([]);
  });

  it("ignores managers and returns every selected branch when the team is empty", () => {
    expect(branchNamesWithoutEmployee(branches, ["b1"], [{ role: "branch_manager", branch_id: "b1" }])).toEqual([
      "תל אביב",
    ]);
    expect(branchNamesWithoutEmployee(branches, ["b1", "b2"], [])).toEqual(["תל אביב", "חיפה"]);
  });

  it("returns nothing when no branch is selected", () => {
    expect(branchNamesWithoutEmployee(branches, [], [])).toEqual([]);
  });
});
