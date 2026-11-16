import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { he } from "../../../../i18n/he";
import StudioSchedule, { type StudioScheduleValue } from "./StudioSchedule";

const daily: StudioScheduleValue = { recurrence: "daily", dueTime: "09:00", weeklyDays: "0,1,2,3,4", monthlyDay: 1 };

describe("StudioSchedule", () => {
  it("has no « פעם אחת » pill without the once option (fixed-task studio)", () => {
    render(<StudioSchedule value={daily} onChange={vi.fn()} />);
    expect(screen.queryByRole("radio", { name: he.studioOnce })).toBeNull();
    expect(screen.getByRole("radio", { name: he.recurrenceLabels.daily }).getAttribute("aria-checked")).toBe("true");
  });

  it("shows date and time for « פעם אחת » and edits them separately", () => {
    const onOnce = vi.fn();
    render(<StudioSchedule value={daily} onChange={vi.fn()} once={{ active: true, dueAt: "2026-11-16T15:00", onChange: onOnce }} />);
    expect(screen.getByRole("radio", { name: he.recurrenceLabels.daily }).getAttribute("aria-checked")).toBe("false");
    expect(screen.queryByRole("group", { name: he.weekdays })).toBeNull();
    fireEvent.change(screen.getByLabelText(he.studioDate), { target: { value: "2026-11-18" } });
    expect(onOnce).toHaveBeenLastCalledWith({ dueAt: "2026-11-18T15:00" });
    fireEvent.change(screen.getByLabelText(he.dueTime), { target: { value: "07:15" } });
    expect(onOnce).toHaveBeenLastCalledWith({ dueAt: "2026-11-16T07:15" });
  });

  it("leaves « פעם אחת » when a recurrence is picked", () => {
    const onChange = vi.fn();
    const onOnce = vi.fn();
    render(<StudioSchedule value={daily} onChange={onChange} once={{ active: true, dueAt: "2026-11-16T15:00", onChange: onOnce }} />);
    fireEvent.click(screen.getByRole("radio", { name: he.recurrenceLabels.weekly }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ recurrence: "weekly" }));
    expect(onOnce).toHaveBeenCalledWith({ active: false });
  });

  it("enters « פעם אחת » from its pill", () => {
    const onOnce = vi.fn();
    render(<StudioSchedule value={daily} onChange={vi.fn()} once={{ active: false, dueAt: "", onChange: onOnce }} />);
    expect(screen.getByRole("group", { name: he.weekdays })).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: he.studioOnce }));
    expect(onOnce).toHaveBeenCalledWith({ active: true });
  });
});
