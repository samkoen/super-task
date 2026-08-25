import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import WeekdayMultiSelect from "./WeekdayMultiSelect";
import { he } from "../../i18n/he";
import { ALL_WEEKDAYS } from "../../utils/taskRecurrence";

describe("WeekdayMultiSelect", () => {
  it("toggles a weekday off the daily selection", () => {
    const onChange = vi.fn();
    render(<WeekdayMultiSelect value={ALL_WEEKDAYS} onChange={onChange} />);
    fireEvent.click(screen.getByText(he.weekdaySat));
    expect(onChange).toHaveBeenCalledWith("0,1,2,3,4,6");
  });

  it("keeps at least one weekday", () => {
    const onChange = vi.fn();
    render(<WeekdayMultiSelect value="0" onChange={onChange} />);
    fireEvent.click(screen.getByText(he.weekdayMon));
    expect(onChange).not.toHaveBeenCalled();
  });
});
