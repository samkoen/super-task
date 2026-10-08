import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EmployeeChatRowItem from "./EmployeeChatRowItem";
import { he } from "../../i18n/he";
import type { EmployeeChatRow } from "../../utils/employeeTaskChats";

const general = (unread: number, preview: string | null): EmployeeChatRow => ({
  kind: "general",
  title: he.employeeGeneralChat,
  last_preview: preview,
  last_at: null,
  unread_count: unread,
});

describe("EmployeeChatRowItem", () => {
  it("highlights a conversation with unread messages and shows the count", () => {
    render(<EmployeeChatRowItem row={general(3, "שלום")} onRow={vi.fn()} />);
    expect(screen.getByRole("button").getAttribute("data-unread")).toBe("true");
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("שלום")).toBeTruthy();
  });

  it("shows a friendly invitation when nothing was written yet", () => {
    render(<EmployeeChatRowItem row={general(0, null)} onRow={vi.fn()} />);
    expect(screen.getByRole("button").getAttribute("data-unread")).toBe("false");
    expect(screen.getByText(he.chatRowEmpty)).toBeTruthy();
  });

  it("never shows an unread count on a task chat and opens it on tap", () => {
    const row: EmployeeChatRow = {
      kind: "task",
      id: "occ-1",
      title: "מדף חלב",
      last_preview: "שאלה",
      last_at: null,
    };
    const onRow = vi.fn();
    render(<EmployeeChatRowItem row={row} onRow={onRow} />);
    expect(screen.getByRole("button").getAttribute("data-unread")).toBe("false");
    fireEvent.click(screen.getByRole("button"));
    expect(onRow).toHaveBeenCalledWith(row);
  });
});
