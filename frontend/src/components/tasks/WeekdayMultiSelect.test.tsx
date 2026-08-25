import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import WeekdayMultiSelect, { WEEKDAY_GROUP_SX } from "./WeekdayMultiSelect";
import { he } from "../../i18n/he";
import { DAILY_DEFAULT_WEEKDAYS } from "../../utils/taskRecurrence";

describe("WeekdayMultiSelect", () => {
  it("rounds Sunday on the right and Saturday on the left in RTL", () => {
    expect(WEEKDAY_GROUP_SX["&& .MuiToggleButtonGroup-firstButton"]).toEqual({
      borderTopLeftRadius: 0,
      borderBottomLeftRadius: 0,
      borderTopRightRadius: "10px",
      borderBottomRightRadius: "10px",
    });
    expect(WEEKDAY_GROUP_SX["&& .MuiToggleButtonGroup-lastButton"]).toEqual({
      borderTopRightRadius: 0,
      borderBottomRightRadius: 0,
      borderTopLeftRadius: "10px",
      borderBottomLeftRadius: "10px",
    });
  });

  it("starts the list with Sunday", () => {
    render(<WeekdayMultiSelect value={DAILY_DEFAULT_WEEKDAYS} onChange={vi.fn()} />);
    const days = screen.getAllByRole("button");
    expect(days[0].textContent).toContain(he.weekdaySun);
    expect(days[days.length - 1].textContent).toContain(he.weekdaySat);
  });

  it("toggles Saturday on the daily default", () => {
    const onChange = vi.fn();
    render(<WeekdayMultiSelect value={DAILY_DEFAULT_WEEKDAYS} onChange={onChange} />);
    fireEvent.click(screen.getByText(he.weekdaySat));
    expect(onChange).toHaveBeenCalledWith("6,0,1,2,3,4,5");
  });

  it("keeps at least one weekday in daily mode", () => {
    const onChange = vi.fn();
    render(<WeekdayMultiSelect value="0" onChange={onChange} />);
    fireEvent.click(screen.getByText(he.weekdayMon));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("allows only one weekday in weekly mode", () => {
    const onChange = vi.fn();
    render(<WeekdayMultiSelect value="6" onChange={onChange} exclusive />);
    fireEvent.click(screen.getByText(he.weekdayMon));
    expect(onChange).toHaveBeenCalledWith("0");
  });
});
