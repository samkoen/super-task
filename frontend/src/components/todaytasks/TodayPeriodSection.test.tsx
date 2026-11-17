import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("has no counter by default (oved) and shows done/total when given (menahel)", () => {
    const { unmount } = render(
      <TodayPeriodSection period="noon" open onToggle={vi.fn()}>
        <div />
      </TodayPeriodSection>,
    );
    expect(screen.queryByTestId("today-period-count-noon")).toBeNull();
    unmount();
    render(
      <TodayPeriodSection period="noon" open onToggle={vi.fn()} counter={{ done: 3, total: 5 }}>
        <div />
      </TodayPeriodSection>,
    );
    const count = screen.getByTestId("today-period-count-noon");
    expect(count.textContent).toBe("3/5");
    expect(count.getAttribute("aria-label")).toBe(he.todayPeriodCount(3, 5));
  });

  it("removes the rows from the page once folded", async () => {
    const { rerender } = render(
      <TodayPeriodSection period="morning" open onToggle={vi.fn()}>
        <div>task row</div>
      </TodayPeriodSection>,
    );
    rerender(
      <TodayPeriodSection period="morning" open={false} onToggle={vi.fn()}>
        <div>task row</div>
      </TodayPeriodSection>,
    );
    await waitFor(() => expect(screen.queryByText("task row")).toBeNull());
  });

  it("calls onToggle when the header is pressed", () => {
    const onToggle = renderSection("evening");
    fireEvent.click(screen.getByTestId("today-period-header-evening"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
