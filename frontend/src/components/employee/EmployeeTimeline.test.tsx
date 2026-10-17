import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import EmployeeTimeline from "./EmployeeTimeline";
import { he } from "../../i18n/he";
import type { EmployeeTaskCard } from "../../services/dashboardService";
import type { TimelineEntry } from "../../utils/employeeTimeline";

function card(id: string, title: string, over: Partial<EmployeeTaskCard> = {}): EmployeeTaskCard {
  return {
    id,
    title,
    description: "",
    due_at: new Date(2026, 9, 15, 9, 30, 0).toISOString(),
    status: "pending",
    task_kind: "fixed",
    photo_required: false,
    department_name: null,
    started_at: null,
    ...over,
  };
}

function entry(task: EmployeeTaskCard, over: Partial<TimelineEntry<EmployeeTaskCard>> = {}) {
  return { task, isNext: false, isDynamic: false, ...over };
}

describe("EmployeeTimeline", () => {
  it("renders one row per task with a small time and a dot", () => {
    render(
      <EmployeeTimeline
        entries={[entry(card("a", "מדף חלב"), { isNext: true }), entry(card("b", "ניקיון קופה"))]}
        onOpen={vi.fn()}
      />,
    );
    const list = screen.getByRole("list", { name: he.employeeTimelineLabel });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(within(list).getAllByText("09:30")).toHaveLength(2);
    expect(screen.getAllByTestId("timeline-dot")).toHaveLength(2);
  });

  it("highlights only the next task with the big action button", () => {
    const onOpen = vi.fn();
    const next = card("a", "מדף חלב");
    render(
      <EmployeeTimeline entries={[entry(next, { isNext: true }), entry(card("b", "ניקיון קופה"))]} onOpen={onOpen} />,
    );
    expect(screen.getAllByTestId("employee-next-task")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: he.doTask }));
    expect(onOpen).toHaveBeenCalledWith(next);
  });

  it("opens a regular row when it is pressed", () => {
    const onOpen = vi.fn();
    const other = card("b", "ניקיון קופה");
    render(<EmployeeTimeline entries={[entry(card("a", "מדף חלב"), { isNext: true }), entry(other)]} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: `${he.openTask}: ניקיון קופה` }));
    expect(onOpen).toHaveBeenCalledWith(other);
  });

  it("renders nothing when there is no task", () => {
    render(<EmployeeTimeline entries={[]} onOpen={vi.fn()} />);
    expect(screen.queryByTestId("employee-timeline")).toBeNull();
  });
});
