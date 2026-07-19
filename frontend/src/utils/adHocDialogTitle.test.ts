import { describe, expect, it } from "vitest";
import { adHocDialogTitle } from "./adHocDialogTitle";

describe("adHocDialogTitle", () => {
  it("appends branch name for branch manager", () => {
    expect(adHocDialogTitle("משימה מזדמנת", "תל אביב", { showBranchBesideTitle: true })).toBe(
      "משימה מזדמנת · תל אביב",
    );
  });

  it("keeps base title for network manager", () => {
    expect(adHocDialogTitle("משימה מזדמנת", "תל אביב", { showBranchBesideTitle: false })).toBe(
      "משימה מזדמנת",
    );
  });

  it("falls back when branch name missing", () => {
    expect(adHocDialogTitle("משימה מזדמנת", "  ", { showBranchBesideTitle: true })).toBe(
      "משימה מזדמנת",
    );
  });
});
