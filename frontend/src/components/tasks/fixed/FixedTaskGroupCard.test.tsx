import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FixedTaskGroupCard from "./FixedTaskGroupCard";
import { fixtureBranch, fixtureGroup } from "./fixedTaskFixtures";
import { he } from "../../../i18n/he";

describe("FixedTaskGroupCard", () => {
  it("shows one card for a network task with its activity summary", () => {
    render(<FixedTaskGroupCard group={fixtureGroup({ active_count: 1 })} onOpen={vi.fn()} />);
    expect(screen.getByText("בדיקת קירור")).toBeTruthy();
    expect(screen.getByText(/09:00/)).toBeTruthy();
    expect(screen.getByText(he.fixedGroupActiveOf(1, 2))).toBeTruthy();
    expect(screen.getByText(he.fixedTaskNetworkChipCount(2))).toBeTruthy();
  });

  it("flags customized and unassigned branches", () => {
    render(
      <FixedTaskGroupCard group={fixtureGroup({ overridden_count: 3, unassigned_count: 1 })} onOpen={vi.fn()} />,
    );
    expect(screen.getByText(he.fixedGroupCustomizedChip(3))).toBeTruthy();
    expect(screen.getByText(he.fixedGroupUnassignedChip(1))).toBeTruthy();
  });

  it("shows assignee and branch for a single-branch task, and its paused state", () => {
    const single = fixtureGroup({
      is_network: false,
      active_count: 0,
      branch_count: 1,
      branches: [fixtureBranch()],
    });
    render(<FixedTaskGroupCard group={single} onOpen={vi.fn()} />);
    expect(screen.getByText("דנה · תל אביב")).toBeTruthy();
    expect(screen.getByText(he.fixedGroupStatusInactive)).toBeTruthy();
    expect(screen.queryByText(he.fixedTaskNetworkChipCount(1))).toBeNull();
  });

  it("says nobody is assigned when a single task has no assignee", () => {
    const single = fixtureGroup({
      is_network: false,
      branches: [fixtureBranch({ assignee_name: null, branch_name: null })],
    });
    render(<FixedTaskGroupCard group={single} onOpen={vi.fn()} />);
    expect(screen.getByText(he.noAssignee)).toBeTruthy();
  });

  it("flags tasks opened by a delivery note", () => {
    const { rerender } = render(<FixedTaskGroupCard group={fixtureGroup()} onOpen={vi.fn()} />);
    expect(screen.queryByText(he.deliveryNotePdf)).toBeNull();
    rerender(<FixedTaskGroupCard group={fixtureGroup({ opened_by_delivery_note: true })} onOpen={vi.fn()} />);
    expect(screen.getByText(he.deliveryNotePdf)).toBeTruthy();
  });

  it("opens the detail when tapped", () => {
    const onOpen = vi.fn();
    render(<FixedTaskGroupCard group={fixtureGroup()} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: `${he.edit}: בדיקת קירור` }));
    expect(onOpen).toHaveBeenCalledOnce();
  });
});
