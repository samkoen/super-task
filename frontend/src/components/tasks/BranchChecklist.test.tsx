import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import BranchChecklist from "./BranchChecklist";
import { he } from "../../i18n/he";

describe("BranchChecklist", () => {
  const branches = [
    { id: "b1", name: "א" },
    { id: "b2", name: "ב" },
  ];

  it("selects every snif when clicking הכל", () => {
    const onChange = vi.fn();
    render(
      <BranchChecklist branches={branches} selectedIds={["b1"]} onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: he.branchesSelectAll }));
    expect(onChange).toHaveBeenCalledWith(["b1", "b2"]);
  });

  it("clears the list when הכל is clicked while all are selected", () => {
    const onChange = vi.fn();
    render(
      <BranchChecklist branches={branches} selectedIds={["b1", "b2"]} onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: he.branchesSelectAll }));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
