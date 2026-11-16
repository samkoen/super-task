import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { he } from "../../../../i18n/he";
import StudioSchedule, { type StudioScheduleValue } from "./StudioSchedule";

const daily: StudioScheduleValue = { recurrence: "daily", dueTime: "09:00", weeklyDays: "0,1,2,3,4", monthlyDay: 1 };

describe("StudioSchedule", () => {
  it("shows recurrence pills and no date for a recurring task", () => {
    render(<StudioSchedule value={daily} onChange={vi.fn()} />);
    expect(screen.queryByRole("radio", { name: he.studioOnce })).toBeNull();
    expect(screen.getByRole("radio", { name: he.recurrenceLabels.daily }).getAttribute("aria-checked")).toBe("true");
    expect(screen.queryByLabelText(he.studioDate)).toBeNull();
  });

  it("shows only date and time for a one-time task, without recurrence pills", () => {
    render(<StudioSchedule value={daily} onChange={vi.fn()} once={{ dueAt: "2026-11-16T15:00", onChange: vi.fn() }} />);
    expect(screen.queryByRole("radiogroup", { name: he.recurrence })).toBeNull();
    expect(screen.queryByRole("radio", { name: he.recurrenceLabels.daily })).toBeNull();
    expect(screen.queryByRole("group", { name: he.weekdays })).toBeNull();
    expect((screen.getByLabelText(he.studioDate) as HTMLInputElement).value).toBe("2026-11-16");
  });

  it("edits the date and the time of a one-time task separately", () => {
    const onOnce = vi.fn();
    render(<StudioSchedule value={daily} onChange={vi.fn()} once={{ dueAt: "2026-11-16T15:00", onChange: onOnce }} />);
    fireEvent.change(screen.getByLabelText(he.studioDate), { target: { value: "2026-11-18" } });
    expect(onOnce).toHaveBeenLastCalledWith("2026-11-18T15:00");
    fireEvent.change(screen.getByLabelText(he.dueTime), { target: { value: "07:15" } });
    expect(onOnce).toHaveBeenLastCalledWith("2026-11-16T07:15");
  });

  it("keeps an incomplete value when the date is cleared", () => {
    const onOnce = vi.fn();
    render(<StudioSchedule value={daily} onChange={vi.fn()} once={{ dueAt: "2026-11-16T15:00", onChange: onOnce }} />);
    fireEvent.change(screen.getByLabelText(he.studioDate), { target: { value: "" } });
    expect(onOnce).toHaveBeenLastCalledWith("");
  });
});
