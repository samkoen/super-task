import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import TaskStatusChip from "./TaskStatusChip";
import { he } from "../../i18n/he";

describe("TaskStatusChip", () => {
  it("renders pending label and test id", () => {
    render(<TaskStatusChip status="pending" />);
    expect(screen.getByTestId("task-status-chip-pending").textContent).toContain(
      he.taskStatusLabels.pending,
    );
  });

  it("renders distinct labels for pending and in_progress", () => {
    const { rerender } = render(<TaskStatusChip status="pending" />);
    expect(screen.getByTestId("task-status-chip-pending").textContent).toContain(
      he.taskStatusLabels.pending,
    );
    rerender(<TaskStatusChip status="in_progress" />);
    expect(screen.getByTestId("task-status-chip-in_progress").textContent).toContain(
      he.taskStatusLabels.in_progress,
    );
  });
});
