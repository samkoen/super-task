import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { TeamMember } from "../../../services/dashboardService";
import ManagerHomeDialogs, { type ManagerHomeDialogsState } from "./ManagerHomeDialogs";

vi.mock("../../tasks/TaskChatDialog", () => ({ default: () => null }));
vi.mock("../../tasks/TaskCompletionReviewDialog", () => ({ default: () => null }));
vi.mock("../../tasks/TaskOccurrenceEditDialog", () => ({ default: () => null }));
vi.mock("../../chat/DirectChatThread", () => ({ default: () => <div data-testid="direct-thread" /> }));
vi.mock("../../team/ManagerEmployeeSheet", () => ({
  default: ({ entry, onClose, onAccount }: { entry: { id: string; branchId: string; state: string } | null; onClose: () => void; onAccount?: unknown }) =>
    entry ? (
      <div data-testid="employee-sheet">
        {`${entry.id}:${entry.branchId}:${entry.state}:${onAccount ? "account" : "no-account"}`}
        <button onClick={onClose}>close</button>
      </div>
    ) : null,
}));

const none: ManagerHomeDialogsState = { chatTask: null, reviewTarget: null, editOccurrenceId: null, member: null, directChat: null };
const member = { user_id: "u1", full_name: "שמואל", status: "in_progress", completed_today: 0, total_today: 1, timeline: [], overdue_backlog: [] } as unknown as TeamMember;

describe("ManagerHomeDialogs", () => {
  it("opens the employee sheet (not the old drawer) for a person of « הצוות עכשיו »", () => {
    const onPatch = vi.fn();
    render(<ManagerHomeDialogs state={{ ...none, member }} branchId="b1" onPatch={onPatch} onCloseDirectChat={vi.fn()} onDone={vi.fn()} onDirectSent={vi.fn()} />);
    expect(screen.getByTestId("employee-sheet").textContent).toContain("u1:b1:working:no-account");
    fireEvent.click(screen.getByText("close"));
    expect(onPatch).toHaveBeenCalledWith({ member: null });
  });

  it("opens the direct chat in full screen", () => {
    render(<ManagerHomeDialogs state={{ ...none, directChat: { id: "c1", title: "דנה" } }} branchId="" onPatch={vi.fn()} onCloseDirectChat={vi.fn()} onDone={vi.fn()} onDirectSent={vi.fn()} />);
    expect(screen.getByTestId("direct-thread")).toBeTruthy();
    expect(screen.getByText("דנה")).toBeTruthy();
  });
});
