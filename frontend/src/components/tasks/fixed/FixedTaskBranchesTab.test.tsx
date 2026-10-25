import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FixedTaskBranchesTab from "./FixedTaskBranchesTab";
import { fixtureBranch, fixtureGroup } from "./fixedTaskFixtures";
import { he } from "../../../i18n/he";

describe("FixedTaskBranchesTab", () => {
  it("renders one row per branch with its assignee and time", () => {
    render(<FixedTaskBranchesTab group={fixtureGroup()} onOpenBranch={vi.fn()} onToggleActive={vi.fn()} />);
    expect(screen.getByText("תל אביב")).toBeTruthy();
    expect(screen.getByText("חיפה")).toBeTruthy();
    expect(screen.getByText("דנה")).toBeTruthy();
    expect(screen.getAllByText(/09:00/).length).toBe(2);
  });

  it("shows the adapted time and which fields were customized", () => {
    const group = fixtureGroup({
      branches: [fixtureBranch({ due_time: "07:30", overridden_fields: ["due_time"] })],
    });
    render(<FixedTaskBranchesTab group={group} onOpenBranch={vi.fn()} onToggleActive={vi.fn()} />);
    expect(screen.getByText(/07:30/)).toBeTruthy();
    expect(screen.getByText(`${he.fixedBranchCustomized}: ${he.fixedOverrideFieldLabels.due_time}`)).toBeTruthy();
  });

  it("warns when a branch has no assignee", () => {
    const group = fixtureGroup({ branches: [fixtureBranch({ assignee_user_id: null, assignee_name: null })] });
    render(<FixedTaskBranchesTab group={group} onOpenBranch={vi.fn()} onToggleActive={vi.fn()} />);
    expect(screen.getByText(he.fixedBranchNoAssignee)).toBeTruthy();
  });

  it("opens a branch when its row is tapped, and toggles activity without opening it", () => {
    const onOpen = vi.fn();
    const onToggle = vi.fn();
    const group = fixtureGroup({ branches: [fixtureBranch()] });
    render(<FixedTaskBranchesTab group={group} onOpenBranch={onOpen} onToggleActive={onToggle} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onToggle).toHaveBeenCalledWith(group.branches[0]);
    expect(onOpen).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: he.fixedBranchSheetTitle("תל אביב") }));
    expect(onOpen).toHaveBeenCalledWith(group.branches[0]);
  });
});
