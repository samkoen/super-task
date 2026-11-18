import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { TaskOccurrence } from "../../../services/taskService";
import { he } from "../../../i18n/he";
import { groupTasksByPeriod } from "../../../utils/managerTasksDay";
import ManagerTasksDayBoard from "./ManagerTasksDayBoard";
import ManagerTasksFilters from "./ManagerTasksFilters";

const at = (hour: number) => new Date(2026, 10, 16, hour, 30).toISOString();

function task(id: string, hour: number, status: TaskOccurrence["status"], patch: Partial<TaskOccurrence> = {}): TaskOccurrence {
  return { id, title: `משימה ${id}`, due_at: at(hour), status, assignee_name: "דני", assignee_user_id: "u1", ...patch } as TaskOccurrence;
}

describe("ManagerTasksDayBoard", () => {
  const tasks = [task("a", 6, "completed"), task("b", 9, "in_progress"), task("c", 19, "pending")];

  it("shows one block per period with its done count", () => {
    render(<ManagerTasksDayBoard groups={groupTasksByPeriod(tasks)} shownDay="2026-11-16" emptyText="" onOpen={vi.fn()} />);
    expect(screen.getByTestId("today-period-count-morning").textContent).toBe("1/2");
    expect(screen.getByTestId("today-period-count-morning").getAttribute("aria-label")).toBe(he.todayPeriodCount(1, 2));
    expect(screen.getByTestId("today-period-count-evening").textContent).toBe("0/1");
    expect(screen.queryByTestId("tasks-period-noon")).toBeNull();
    expect(screen.getByTestId("tasks-row-b").getAttribute("data-state")).toBe("active");
    expect(within(screen.getByTestId("tasks-period-morning")).getByText("06:30")).toBeTruthy();
  });

  it("uses the oved screen components: same period header and task rows", () => {
    render(<ManagerTasksDayBoard groups={groupTasksByPeriod(tasks)} shownDay="2026-11-16" emptyText="" onOpen={vi.fn()} />);
    const morning = screen.getByTestId("tasks-period-morning");
    expect(within(morning).getByTestId("today-period-header-morning").textContent).toContain(he.todayPeriodTitles.morning);
    expect(within(morning).getAllByTestId("today-task-checkbox")).toHaveLength(2);
    // Pas de ⋮ côté menahel : une seule action, toute la ligne ouvre la tâche.
    expect(screen.queryByTestId("today-task-more")).toBeNull();
  });

  it("maps the five menahel states onto done / pending + tone", () => {
    const all = [
      task("d", 7, "completed"),
      task("r", 8, "pending_review"),
      task("a", 9, "in_progress"),
      task("l", 10, "overdue"),
      task("t", 11, "pending"),
    ];
    render(<ManagerTasksDayBoard groups={groupTasksByPeriod(all)} shownDay="2026-11-16" emptyText="" onOpen={vi.fn()} />);
    const checked = (id: string) => within(screen.getByTestId(`tasks-row-${id}`)).getByTestId("today-task-checkbox").getAttribute("data-done");
    expect(["d", "r", "a", "l", "t"].map(checked)).toEqual(["true", "true", "false", "false", "false"]);
    expect(screen.getByTestId("tasks-row-r").getAttribute("data-state")).toBe("review");
    expect(screen.getByTestId("tasks-row-l").getAttribute("data-tone")).toBe("late");
    expect(screen.getByTestId("tasks-row-a").getAttribute("data-tone")).toBe("active");
    expect(screen.getByTestId("tasks-row-t").getAttribute("data-tone")).toBeNull();
    expect(screen.getByTestId("tasks-row-d").getAttribute("data-tone")).toBeNull();
  });

  it("shows who does the task, its status, and the planned duration when there is one", () => {
    const rows = [task("x", 9, "pending_review", { duration_minutes: 15 }), task("y", 10, "pending", { assignee_name: null })];
    render(<ManagerTasksDayBoard groups={groupTasksByPeriod(rows)} shownDay="2026-11-16" emptyText="" onOpen={vi.fn()} />);
    expect(within(screen.getByTestId("tasks-row-x")).getByTestId("today-task-subtitle").textContent).toBe(
      `דני · ${he.taskStatusLabels.pending_review} · ${he.todayTaskMinutes(15)}`,
    );
    expect(within(screen.getByTestId("tasks-row-y")).getByTestId("today-task-subtitle").textContent).toContain(he.managerTasksUnassigned);
  });

  it("puts the date before the time when the task is not from the shown day", () => {
    render(<ManagerTasksDayBoard groups={groupTasksByPeriod([task("o", 9, "overdue")])} shownDay="2026-11-17" emptyText="" onOpen={vi.fn()} />);
    expect(within(screen.getByTestId("tasks-row-o")).getByText("16.11 09:30")).toBeTruthy();
  });

  it("puts a 17:30 task in the evening, like the oved screen", () => {
    render(<ManagerTasksDayBoard groups={groupTasksByPeriod([task("e", 17, "pending")])} shownDay="2026-11-16" emptyText="" onOpen={vi.fn()} />);
    expect(within(screen.getByTestId("tasks-period-evening")).getByTestId("tasks-row-e")).toBeTruthy();
  });

  it("opens a task and folds a period", async () => {
    const onOpen = vi.fn();
    render(<ManagerTasksDayBoard groups={groupTasksByPeriod(tasks)} shownDay="2026-11-16" emptyText="" onOpen={onOpen} />);
    fireEvent.click(screen.getByTestId("tasks-row-c"));
    expect(onOpen).toHaveBeenCalledWith(tasks[2]);
    const header = screen.getByTestId("today-period-header-evening");
    fireEvent.click(header);
    expect(header.getAttribute("aria-expanded")).toBe("false");
    await waitFor(() => expect(screen.queryByTestId("tasks-row-c")).toBeNull());
  });

  it("says when the day is empty", () => {
    render(<ManagerTasksDayBoard groups={[]} shownDay="2026-11-16" emptyText={he.managerTasksEmpty} onOpen={vi.fn()} />);
    expect(screen.getByTestId("tasks-empty").textContent).toBe(he.managerTasksEmpty);
  });
});

describe("ManagerTasksFilters", () => {
  function renderFilters(patch = {}) {
    const props = {
      employees: [{ value: "u1", label: "דני" }],
      statuses: [{ value: "overdue", label: he.taskStatusLabels.overdue }],
      employeeId: "",
      status: "",
      dayLabel: he.managerTasksToday,
      onEmployee: vi.fn(),
      onStatus: vi.fn(),
      onPrevDay: vi.fn(),
      onNextDay: vi.fn(),
      ...patch,
    };
    render(<ManagerTasksFilters {...props} />);
    return props;
  }

  it("picks an oved and shows the choice on the pill", () => {
    const props = renderFilters();
    fireEvent.click(screen.getByTestId("tasks-filter-employee"));
    fireEvent.click(screen.getByRole("menuitem", { name: "דני" }));
    expect(props.onEmployee).toHaveBeenCalledWith("u1");
  });

  it("shows the chosen status and resets it with « הכל »", () => {
    const props = renderFilters({ status: "overdue" });
    expect(screen.getByTestId("tasks-filter-status").textContent).toContain(he.taskStatusLabels.overdue);
    fireEvent.click(screen.getByTestId("tasks-filter-status"));
    fireEvent.click(screen.getByRole("menuitem", { name: he.managerTasksAll }));
    expect(props.onStatus).toHaveBeenCalledWith("");
  });

  it("moves one day back and forward", () => {
    const props = renderFilters();
    fireEvent.click(screen.getByRole("button", { name: he.managerTasksPrevDay }));
    fireEvent.click(screen.getByRole("button", { name: he.managerTasksNextDay }));
    expect(props.onPrevDay).toHaveBeenCalledTimes(1);
    expect(props.onNextDay).toHaveBeenCalledTimes(1);
  });
});
