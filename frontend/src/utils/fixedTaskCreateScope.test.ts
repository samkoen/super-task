import { describe, expect, it } from "vitest";
import {
  createFieldsFromBranchSelection,
  isAllBranchesSelected,
  isGroupedBranchSelection,
  isGroupedFixedCreate,
  parseMultiSelectIds,
  selectedBranchLabels,
  groupedCreateApiFields,
  toggleAllBranches,
  toggleBranchId,
} from "./fixedTaskCreateScope";

describe("fixedTaskCreateScope", () => {
  it("treats selected and all as grouped create", () => {
    expect(isGroupedFixedCreate("one")).toBe(false);
    expect(isGroupedFixedCreate("selected")).toBe(true);
    expect(isGroupedFixedCreate("all")).toBe(true);
    expect(isGroupedBranchSelection(["b1"])).toBe(false);
    expect(isGroupedBranchSelection(["b1", "b2"])).toBe(true);
  });

  it("parses multi-select values", () => {
    expect(parseMultiSelectIds(["b1", "b2"])).toEqual(["b1", "b2"]);
    expect(parseMultiSelectIds("b1,b2")).toEqual(["b1", "b2"]);
    expect(parseMultiSelectIds("")).toEqual([]);
  });

  it("labels selected branches", () => {
    const branches = [
      { id: "b1", name: "א" },
      { id: "b2", name: "ב" },
      { id: "b3", name: "ג" },
    ];
    expect(selectedBranchLabels(["b3", "b1"], branches)).toBe("א, ג");
  });

  it("toggles הכל to select or clear every snif", () => {
    expect(toggleAllBranches([], ["b1", "b2"])).toEqual(["b1", "b2"]);
    expect(toggleAllBranches(["b1", "b2"], ["b1", "b2"])).toEqual([]);
    expect(isAllBranchesSelected(["b1", "b2"], ["b1", "b2"])).toBe(true);
    expect(toggleBranchId(["b1"], "b2")).toEqual(["b1", "b2"]);
    expect(toggleBranchId(["b1", "b2"], "b1")).toEqual(["b2"]);
  });

  it("maps one / several / all snifs to API fields", () => {
    expect(createFieldsFromBranchSelection(["b1"], ["b1", "b2"])).toEqual({
      grouped: false,
      apply_to_network: false,
      branch_id: "b1",
    });
    expect(createFieldsFromBranchSelection(["b1", "b2"], ["b1", "b2", "b3"])).toEqual({
      grouped: true,
      apply_to_network: true,
      branch_ids: ["b1", "b2"],
      branch_id: "",
    });
    expect(createFieldsFromBranchSelection(["b1", "b2"], ["b1", "b2"])).toEqual({
      grouped: true,
      apply_to_network: true,
      branch_id: "",
    });
  });

  it("builds API fields for one / selected / all", () => {
    expect(
      groupedCreateApiFields({
        apply_to_network: false,
        branch_id: "b1",
        assignee_user_id: "u1",
      }),
    ).toEqual({ branch_id: "b1", assignee_user_id: "u1" });
    expect(
      groupedCreateApiFields({
        apply_to_network: true,
        branch_ids: ["b1", "b2"],
        branch_id: "",
        assignee_user_id: "",
      }),
    ).toEqual({ apply_to_network: true, branch_ids: ["b1", "b2"] });
    expect(
      groupedCreateApiFields({
        apply_to_network: true,
        branch_id: "",
        assignee_user_id: "",
      }),
    ).toEqual({ apply_to_network: true });
  });
});
