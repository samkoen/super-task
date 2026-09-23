import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import EmployeeManagerWaitingSection from "./EmployeeManagerWaitingSection";
import { he } from "../../i18n/he";
import type { EmployeeTaskCard } from "../../services/dashboardService";

function task(over: Partial<EmployeeTaskCard> = {}): EmployeeTaskCard {
  return {
    id: "t1",
    title: "ניקוי מדף",
    description: "",
    due_at: "2026-09-23T12:00:00+03:00",
    status: "in_progress",
    task_kind: "fixed",
    photo_required: false,
    department_name: null,
    started_at: null,
    manager_message_preview: "תסתכל בתמונה",
    ...over,
  };
}

describe("EmployeeManagerWaitingSection", () => {
  it("hides the block when the manager is not waiting", () => {
    const { container } = render(<EmployeeManagerWaitingSection tasks={[]} onOpen={vi.fn()} />);
    expect(container.textContent).toBe("");
  });

  it("shows the title, the last message, and opens the chat", () => {
    const onOpen = vi.fn();
    render(<EmployeeManagerWaitingSection tasks={[task()]} onOpen={onOpen} />);
    expect(screen.getByText(`${he.employeeManagerWaiting} (1)`)).toBeTruthy();
    expect(screen.getByText("ניקוי מדף")).toBeTruthy();
    expect(screen.getByText("תסתכל בתמונה")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: he.taskChatOpen }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: "t1" }));
  });
});
