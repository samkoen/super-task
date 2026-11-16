import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { TaskOccurrence } from "../../../services/taskService";
import { he } from "../../../i18n/he";
import { groupTasksByPeriod } from "../../../utils/managerTasksDay";
import ManagerTaskEditFooter from "./ManagerTaskEditFooter";
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
    expect(screen.getByTestId("tasks-count-morning").textContent).toBe("1/2");
    expect(screen.getByTestId("tasks-count-evening").textContent).toBe("0/1");
    expect(screen.queryByTestId("tasks-period-noon")).toBeNull();
    expect(screen.getByTestId("tasks-row-b").getAttribute("data-state")).toBe("active");
    expect(within(screen.getByTestId("tasks-period-morning")).getByText("06:30")).toBeTruthy();
  });

  it("opens a task and folds a period", () => {
    const onOpen = vi.fn();
    render(<ManagerTasksDayBoard groups={groupTasksByPeriod(tasks)} shownDay="2026-11-16" emptyText="" onOpen={onOpen} />);
    fireEvent.click(screen.getByTestId("tasks-row-c"));
    expect(onOpen).toHaveBeenCalledWith(tasks[2]);
    fireEvent.click(within(screen.getByTestId("tasks-period-evening")).getByRole("button", { name: he.managerTasksCollapse }));
    expect(screen.queryByTestId("tasks-row-c")).toBeNull();
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

describe("ManagerTaskEditFooter", () => {
  it("offers the next-task mark and the deletion on an open task", () => {
    const onSetManagerNext = vi.fn();
    const onDelete = vi.fn();
    const open = task("a", 9, "pending");
    render(<ManagerTaskEditFooter task={open} onSetManagerNext={onSetManagerNext} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onSetManagerNext).toHaveBeenCalledWith(open, true);
    fireEvent.click(screen.getByTestId("task-edit-delete"));
    expect(onDelete).toHaveBeenCalledWith(open);
  });

  it("shows nothing on a closed task", () => {
    const { container } = render(<ManagerTaskEditFooter task={task("a", 9, "completed")} onSetManagerNext={vi.fn()} onDelete={vi.fn()} />);
    expect(container.textContent).toBe("");
  });
});
