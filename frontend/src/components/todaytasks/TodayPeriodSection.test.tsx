import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import TodayPeriodSection from "./TodayPeriodSection";
import { he } from "../../i18n/he";
import type { TodayPeriod } from "../../utils/todayPeriods";

function renderSection(period: TodayPeriod, open = true, onToggle = vi.fn()) {
  render(
    <TodayPeriodSection period={period} open={open} onToggle={onToggle}>
      <div>task row</div>
    </TodayPeriodSection>,
  );
  return onToggle;
}

describe("TodayPeriodSection", () => {
  it.each([
    ["morning", "icon-sun", "btn-collapse-dark"],
    ["noon", "icon-sun", "btn-collapse-dark"],
    ["evening", "icon-moon", "btn-collapse-light"],
  ] as const)("uses the Figma title and icons for %s", (period, icon, arrow) => {
    renderSection(period);
    const header = screen.getByTestId(`today-period-header-${period}`);
    expect(header.textContent).toContain(he.todayPeriodTitles[period]);
    const sources = Array.from(header.querySelectorAll("img")).map((img) => img.getAttribute("src") ?? "");
    expect(sources[0]).toContain(icon);
    expect(sources[1]).toContain(arrow);
  });

  it("shows its tasks and exposes the expanded state", () => {
    renderSection("morning");
    expect(screen.getByText("task row")).toBeTruthy();
    const header = screen.getByTestId("today-period-header-morning");
    expect(header.getAttribute("aria-expanded")).toBe("true");
    expect(header.getAttribute("aria-label")).toContain(he.todayPeriodCollapse);
  });

  it("collapsed: chevron points down and the label offers to expand", () => {
    renderSection("noon", false);
    const header = screen.getByTestId("today-period-header-noon");
    expect(header.getAttribute("aria-expanded")).toBe("false");
    expect(header.getAttribute("aria-label")).toContain(he.todayPeriodExpand);
  });

  it("calls onToggle when the header is pressed", () => {
    const onToggle = renderSection("evening");
    fireEvent.click(screen.getByTestId("today-period-header-evening"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
