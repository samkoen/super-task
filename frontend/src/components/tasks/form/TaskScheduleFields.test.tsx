import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TaskScheduleFields, { scheduleSummary, type TaskScheduleValue } from "./TaskScheduleFields";
import { he } from "../../../i18n/he";

const value: TaskScheduleValue = {
  dueAt: "2026-07-20T10:00",
  recurrence: "daily",
  dueTime: "09:00",
  weeklyDays: "6,0,1",
  monthlyDay: 1,
};

describe("TaskScheduleFields", () => {
  it("offers quick times and a readable date for a one-off task", () => {
    const onChange = vi.fn();
    render(<TaskScheduleFields taskKind="ad_hoc" toGallery={false} value={value} onChange={onChange} />);
    expect(screen.getByTestId("due-preview").textContent).toContain("10:00");
    fireEvent.click(screen.getByRole("button", { name: he.followUpTomorrow }));
    expect(onChange).toHaveBeenCalledWith({ dueAt: expect.stringMatching(/T09:00$/) });
  });

  it("shows nothing for a gallery task", () => {
    const { container } = render(
      <TaskScheduleFields taskKind="ad_hoc" toGallery value={value} onChange={vi.fn()} />,
    );
    expect(container.textContent).toBe("");
  });

  it("shows the recurrence summary for a fixed task and updates it live", () => {
    const { rerender } = render(
      <TaskScheduleFields taskKind="fixed" toGallery={false} value={value} onChange={vi.fn()} />,
    );
    expect(screen.getByTestId("schedule-summary").textContent).toContain("09:00");
    rerender(
      <TaskScheduleFields
        taskKind="fixed"
        toGallery={false}
        value={{ ...value, dueTime: "14:30" }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId("schedule-summary").textContent).toContain("14:30");
  });

  it("keeps a single weekday when switching to weekly", () => {
    const onChange = vi.fn();
    render(<TaskScheduleFields taskKind="fixed" toGallery={false} value={value} onChange={onChange} />);
    fireEvent.mouseDown(screen.getByLabelText(he.recurrence));
    fireEvent.click(screen.getByRole("option", { name: he.recurrenceLabels.weekly }));
    const patch = onChange.mock.calls[0][0];
    expect(patch.recurrence).toBe("weekly");
    expect(patch.weeklyDays.split(",")).toHaveLength(1);
  });

  it("asks for a day of the month when monthly", () => {
    render(
      <TaskScheduleFields
        taskKind="fixed"
        toGallery={false}
        value={{ ...value, recurrence: "monthly", monthlyDay: 15 }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(he.monthlyDay)).toBeTruthy();
    expect(screen.queryByLabelText(he.weekdays)).toBeNull();
  });
});

describe("scheduleSummary", () => {
  it("mentions the day of month for monthly tasks", () => {
    expect(scheduleSummary({ ...value, recurrence: "monthly", monthlyDay: 12 })).toContain("12");
  });
});
