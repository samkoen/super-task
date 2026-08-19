import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import EmployeeTaskDetailDialog from "./EmployeeTaskDetailDialog";
import { he } from "../../i18n/he";
import type { TaskStatus } from "../../services/taskService";

vi.mock("./TaskChatPanel", () => ({
  default: () => <div data-testid="task-chat-panel">{he.taskChatTitle}</div>,
}));

vi.mock("./TaskReferenceMediaDisplay", () => ({
  default: () => null,
}));

function task(status: TaskStatus = "pending") {
  return {
    id: "t1",
    title: "צילום מדף",
    description: "לצלם את המדף",
    status,
    due_at: "2026-08-19T23:59:00+03:00",
  };
}

describe("EmployeeTaskDetailDialog", () => {
  it("offers a single do-task action that opens capture", () => {
    const onDoTask = vi.fn();
    render(
      <EmployeeTaskDetailDialog task={task()} onClose={vi.fn()} onDoTask={onDoTask} />,
    );
    expect(screen.queryByText(he.startTask)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: he.doTask }));
    expect(onDoTask).toHaveBeenCalledTimes(1);
  });

  it("does not show do-task when waiting for manager review", () => {
    render(
      <EmployeeTaskDetailDialog
        task={task("pending_review")}
        onClose={vi.fn()}
        onDoTask={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: he.doTask })).toBeNull();
    expect(screen.queryByRole("button", { name: he.markDone })).toBeNull();
  });
});
