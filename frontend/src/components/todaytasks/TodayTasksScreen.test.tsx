import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import TodayTasksScreen, { type TodayTask } from "./TodayTasksScreen";
import { he } from "../../i18n/he";

vi.mock("../notifications/NotificationBell", () => ({
  default: ({ renderTrigger }: { renderTrigger: (open: () => void, unread: number) => JSX.Element }) =>
    renderTrigger(() => undefined, 2),
}));

vi.mock("../../hooks/useResolvedMediaSrc", () => ({
  useResolvedMediaSrc: () => ({ src: null }),
}));

function at(hour: number, minute = 0): string {
  return new Date(2026, 10, 17, hour, minute).toISOString();
}

const tasks: TodayTask[] = [
  { id: "m1", title: "בדיקת מלאי במחלקה", due_at: at(7, 30), status: "completed", duration_minutes: 15 },
  { id: "m2", title: "ניקוי מדפים", due_at: at(9), status: "pending" },
  { id: "e1", title: "סגירת קופה", due_at: at(20), status: "in_progress" },
];

function renderScreen(overrides: Partial<Parameters<typeof TodayTasksScreen>[0]> = {}) {
  const props = {
    tasks,
    employeeName: "אבי כהן",
    onOpenTask: vi.fn(),
    onOpenTaskChat: vi.fn(),
    onOpenChats: vi.fn(),
    onOpenAccount: vi.fn(),
    ...overrides,
  };
  render(<TodayTasksScreen {...props} />);
  return props;
}

describe("TodayTasksScreen", () => {
  it("shows the Figma header: title, bell with dot, greeting with the first name", () => {
    renderScreen();
    expect(screen.getByRole("heading", { name: he.todayTasksTitle })).toBeTruthy();
    expect(screen.getByTestId("today-bell-dot")).toBeTruthy();
    expect(screen.getByTestId("today-greeting").textContent).toContain("אבי");
    expect(screen.getByTestId("today-greeting").textContent).not.toContain("כהן");
  });

  it("groups tasks by period and hides empty periods", () => {
    renderScreen();
    expect(screen.getByTestId("today-period-morning")).toBeTruthy();
    expect(screen.queryByTestId("today-period-noon")).toBeNull();
    const morning = within(screen.getByTestId("today-period-tasks-morning")).getAllByTestId("today-task-item");
    expect(morning.map((row) => row.getAttribute("data-state"))).toEqual(["done", "pending"]);
    expect(within(morning[0]).getByText("07:30")).toBeTruthy();
    expect(within(morning[0]).getByText(he.todayTaskMinutes(15))).toBeTruthy();
    expect(within(screen.getByTestId("today-period-tasks-evening")).getByText("סגירת קופה")).toBeTruthy();
  });

  it("opens the task on row click, and the chat from the ⋮ menu without opening the task", () => {
    const props = renderScreen();
    const [first] = screen.getAllByTestId("today-task-item");
    fireEvent.click(first);
    expect(props.onOpenTask).toHaveBeenCalledWith(tasks[0]);
    fireEvent.click(within(first).getByTestId("today-task-more"));
    expect(props.onOpenTask).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId("today-task-menu-chat"));
    expect(props.onOpenTaskChat).toHaveBeenCalledWith(tasks[0]);
  });

  it("folds a period with its chevron", () => {
    renderScreen();
    const header = screen.getByTestId("today-period-header-morning");
    expect(header.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(header);
    expect(header.getAttribute("aria-expanded")).toBe("false");
  });

  it("while loading shows only the background and a spinner: no header, no bottom nav, no empty message", () => {
    renderScreen({ tasks: [], loading: true });
    expect(screen.getByTestId("today-tasks-loading").getAttribute("aria-label")).toBe(he.todayTasksLoading);
    expect(screen.queryByRole("heading", { name: he.todayTasksTitle })).toBeNull();
    expect(screen.queryByTestId("today-greeting")).toBeNull();
    expect(screen.queryByTestId("flow-bottom-nav")).toBeNull();
    expect(screen.queryByText(he.todayTasksEmpty)).toBeNull();
  });

  it("shows the empty message once loaded with no task", () => {
    renderScreen({ tasks: [] });
    expect(screen.getByText(he.todayTasksEmpty)).toBeTruthy();
    expect(screen.queryByTestId("today-tasks-loading")).toBeNull();
  });

  it("routes the bottom nav chat tab and the avatar", () => {
    const props = renderScreen();
    fireEvent.click(screen.getByTestId("flow-nav-chat"));
    fireEvent.click(screen.getByTestId("today-avatar"));
    expect(props.onOpenChats).toHaveBeenCalledTimes(1);
    expect(props.onOpenAccount).toHaveBeenCalledTimes(1);
  });
});
