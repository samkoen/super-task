import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import TodayTaskItem from "./TodayTaskItem";
import { he } from "../../i18n/he";

function renderItem(overrides: Partial<Parameters<typeof TodayTaskItem>[0]> = {}) {
  const props = {
    title: "בדיקת מלאי במחלקה",
    time: "07:30",
    subtitle: he.todayTaskMinutes(15),
    done: false,
    onOpen: vi.fn(),
    onOpenChat: vi.fn(),
    ...overrides,
  };
  render(<TodayTaskItem {...props} />);
  return props;
}

describe("TodayTaskItem", () => {
  it("shows title, time and duration in Figma order (checkbox · time · text · ⋮)", () => {
    renderItem();
    const row = screen.getByTestId("today-task-item");
    expect(row.textContent).toContain("07:30");
    expect(screen.getByText("בדיקת מלאי במחלקה")).toBeTruthy();
    expect(screen.getByText(he.todayTaskMinutes(15))).toBeTruthy();
    const order = Array.from(row.querySelectorAll("[data-testid]")).map((el) => el.getAttribute("data-testid"));
    expect(order.indexOf("today-task-checkbox")).toBeLessThan(order.indexOf("today-task-title"));
    expect(order.indexOf("today-task-title")).toBeLessThan(order.indexOf("today-task-more"));
  });

  it("hides the duration line when there is none", () => {
    renderItem({ subtitle: null });
    expect(screen.queryByText(he.todayTaskMinutes(15))).toBeNull();
  });

  it("renders the Pending state: empty checkbox, no check icon", () => {
    renderItem();
    expect(screen.getByTestId("today-task-item").getAttribute("data-state")).toBe("pending");
    const box = screen.getByTestId("today-task-checkbox");
    expect(box.getAttribute("data-done")).toBe("false");
    expect(box.querySelector("img")).toBeNull();
  });

  it("renders the Done state: green check and a 'done' accessible name", () => {
    renderItem({ done: true });
    const row = screen.getByTestId("today-task-item");
    expect(row.getAttribute("data-state")).toBe("done");
    expect(row.getAttribute("aria-label")).toContain(he.todayTaskDone);
    expect(screen.getByTestId("today-task-checkbox").querySelector("img")?.getAttribute("src")).toContain("icon-check-small");
  });

  it("opens the task on click, Enter and Space", () => {
    const props = renderItem();
    const row = screen.getByTestId("today-task-item");
    fireEvent.click(row);
    fireEvent.keyDown(row, { key: "Enter" });
    fireEvent.keyDown(row, { key: " " });
    fireEvent.keyDown(row, { key: "a" });
    expect(props.onOpen).toHaveBeenCalledTimes(3);
  });

  it("⋮ opens a menu without opening the task; each entry calls its action once", async () => {
    const props = renderItem();
    fireEvent.click(screen.getByTestId("today-task-more"));
    expect(props.onOpen).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByTestId("today-task-menu-open"));
    expect(props.onOpen).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId("today-task-more"));
    fireEvent.click(await screen.findByTestId("today-task-menu-chat"));
    expect(props.onOpenChat).toHaveBeenCalledTimes(1);
    expect(props.onOpen).toHaveBeenCalledTimes(1);
  });

  it("without a secondary action there is no ⋮ and the row still opens", () => {
    const props = renderItem({ onOpenChat: undefined });
    expect(screen.queryByTestId("today-task-more")).toBeNull();
    fireEvent.click(screen.getByTestId("today-task-item"));
    expect(props.onOpen).toHaveBeenCalledTimes(1);
  });

  it("tone late: red second line; tone active: orange outline; both ignored once done", () => {
    const { unmount } = render(
      <TodayTaskItem title="t" time="09:00" subtitle="דני · באיחור" done={false} tone="late" onOpen={vi.fn()} />,
    );
    expect(screen.getByTestId("today-task-item").getAttribute("data-tone")).toBe("late");
    expect(getComputedStyle(screen.getByTestId("today-task-subtitle")).color).toBe("rgb(229, 50, 45)");
    unmount();
    const second = render(<TodayTaskItem title="t" time="09:00" done={false} tone="active" onOpen={vi.fn()} />);
    expect(getComputedStyle(screen.getByTestId("today-task-item")).boxShadow).toContain("inset");
    second.unmount();
    render(<TodayTaskItem title="t" time="09:00" done tone="late" onOpen={vi.fn()} />);
    expect(screen.getByTestId("today-task-item").getAttribute("data-tone")).toBeNull();
  });

  it("custom test id and business state are exposed as given", () => {
    renderItem({ testId: "tasks-row-x", dataState: "review", done: true });
    expect(screen.getByTestId("tasks-row-x").getAttribute("data-state")).toBe("review");
  });

  it("keyboard on ⋮ does not open the task", () => {
    const props = renderItem();
    fireEvent.keyDown(screen.getByTestId("today-task-more"), { key: "Enter" });
    expect(props.onOpen).not.toHaveBeenCalled();
  });
});
